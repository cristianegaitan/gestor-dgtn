import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { before, beforeEach, after, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { trabajo, egreso } from './helpers/api.mjs'

const usuarioA = '11111111-1111-4111-8111-111111111111'
const usuarioB = '22222222-2222-4222-8222-222222222222'
const directorio = new URL('../supabase/migrations/', import.meta.url)
const inicial = await readFile(new URL('20261012_esquema_inicial.sql', directorio), 'utf8')
const revisiones = await readFile(new URL('20261013_registro_revisiones.sql', directorio), 'utf8')
let db

before(async () => {
  db = new PGlite()
  await db.exec(await readFile(new URL('./fixtures/auth-pruebas.sql', import.meta.url), 'utf8'))
  // Se ejecuta el historial real, no una copia del esquema escrita para las pruebas.
  const migraciones = (await readdir(directorio)).filter((nombre) => nombre.endsWith('.sql')).sort()
  for (const nombre of migraciones) await db.exec(await readFile(new URL(nombre, directorio), 'utf8'))
})

beforeEach(async () => {
  await db.exec('reset role; truncate public.trabajos, public.egresos;')
  await db.query('insert into auth.users (id) values ($1), ($2) on conflict do nothing', [usuarioA, usuarioB])
})

after(async () => { await db?.close() })

async function comoUsuario(usuario, operacion, rol = 'authenticated') {
  assert.ok(['authenticated', 'anon'].includes(rol))
  await db.exec(`set role ${rol}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [usuario || ''])
  try { return await operacion() } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

async function insertar(tabla, datos, usuario = usuarioA, orden = 0) {
  assert.ok(['trabajos', 'egresos'].includes(tabla))
  const sql = tabla === 'trabajos'
    ? 'insert into public.trabajos (usuario_id, id, datos) values ($1, $2, $3) returning revision'
    : 'insert into public.egresos (usuario_id, id, datos, orden) values ($1, $2, $3, $4) returning revision'
  return db.query(sql, [usuario, datos.id, JSON.stringify(datos), ...(tabla === 'egresos' ? [orden] : [])])
}

test('el historial SQL instala tablas, políticas, índices y triggers en una base vacía', async () => {
  const resultado = await db.query(await readFile(new URL('../supabase/diagnosticos/verificar_esquema.sql', import.meta.url), 'utf8'))
  const esquema = resultado.rows[0].esquema_gestor
  assert.deepEqual(esquema.tablas.map((t) => [t.nombre, t.rls]), [['egresos', true], ['trabajos', true]])
  assert.equal(esquema.politicas.length, 8)
  assert.equal(esquema.triggers.length, 2)
  assert.ok(esquema.indices.some((i) => i.nombre === 'egresos_usuario_orden_id'))
  assert.equal(esquema.columnas.filter((c) => c.columna === 'revision' && c.valor_inicial === '0').length, 2)
})

test('el usuario autenticado puede crear, leer, editar y borrar sus trabajos y egresos', async () => {
  await comoUsuario(usuarioA, async () => {
    const permisos = await db.query('select rolsuper, rolbypassrls from pg_roles where rolname = current_user')
    assert.deepEqual(permisos.rows[0], { rolsuper: false, rolbypassrls: false })
    for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
      assert.equal(Number((await insertar(tabla, datos)).rows[0].revision), 0)
      const lectura = await db.query(`select datos from public.${tabla}`)
      assert.deepEqual(lectura.rows[0].datos, datos)
      const edicion = await db.query(`update public.${tabla} set datos = $1 where id = $2 and revision = 0 returning revision`,
        [JSON.stringify({ ...datos, ...(tabla === 'trabajos' ? { cliente: 'Editado' } : { concepto: 'Editado' }) }), datos.id])
      assert.equal(Number(edicion.rows[0].revision), 1)
      const borrado = await db.query(`delete from public.${tabla} where id = $1 and revision = 1 returning id`, [datos.id])
      assert.equal(borrado.rows.length, 1)
    }
  })
})

test('RLS impide leer, modificar o borrar filas ajenas aunque la consulta omita el filtro de usuario', async () => {
  for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
    await insertar(tabla, datos, usuarioB)
    await comoUsuario(usuarioA, async () => {
      assert.deepEqual((await db.query(`select * from public.${tabla}`)).rows, [])
      assert.equal((await db.query(`update public.${tabla} set datos = datos returning id`)).rows.length, 0)
      assert.equal((await db.query(`delete from public.${tabla} returning id`)).rows.length, 0)
    })
    const conservado = await db.query(`select datos, revision from public.${tabla}`)
    assert.deepEqual(conservado.rows[0].datos, datos)
    assert.equal(Number(conservado.rows[0].revision), 0)
  }
})

test('RLS rechaza crear registros a nombre de otra persona o transferirle una fila propia', async () => {
  await comoUsuario(usuarioA, async () => {
    for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
      await assert.rejects(insertar(tabla, datos, usuarioB), { code: '42501' })
      await insertar(tabla, datos)
      await assert.rejects(db.query(`update public.${tabla} set usuario_id = $1 where id = $2`, [usuarioB, datos.id]),
        { code: '42501' })
    }
  })
})

test('sin identidad o con rol anónimo no se accede a los datos ni se pueden vaciar las tablas', async () => {
  await insertar('trabajos', trabajo())
  await insertar('egresos', egreso())
  await comoUsuario(null, async () => {
    for (const [tabla, datos] of [['trabajos', trabajo(2)], ['egresos', egreso('e2')]]) {
      assert.deepEqual((await db.query(`select * from public.${tabla}`)).rows, [])
      assert.equal((await db.query(`delete from public.${tabla} returning id`)).rows.length, 0)
      await assert.rejects(insertar(tabla, datos), { code: '42501' })
      await assert.rejects(db.query(`truncate public.${tabla}`), { code: '42501' })
    }
  })
  await comoUsuario(null, async () => {
    for (const tabla of ['trabajos', 'egresos']) {
      await assert.rejects(db.query(`select * from public.${tabla}`), { code: '42501' })
      await assert.rejects(db.query(`delete from public.${tabla}`), { code: '42501' })
    }
    await assert.rejects(insertar('trabajos', trabajo(2)), { code: '42501' })
    await assert.rejects(insertar('egresos', egreso('e2')), { code: '42501' })
  }, 'anon')
  assert.equal((await db.query('select count(*)::int as total from public.trabajos')).rows[0].total, 1)
})

test('la clave compuesta admite IDs iguales entre usuarios y rechaza duplicados del mismo usuario', async () => {
  for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
    await comoUsuario(usuarioA, () => insertar(tabla, datos))
    await comoUsuario(usuarioB, () => insertar(tabla, datos, usuarioB))
    await comoUsuario(usuarioA, async () => {
      assert.equal((await db.query(`select * from public.${tabla}`)).rows.length, 1)
      await assert.rejects(insertar(tabla, datos), { code: '23505' })
    })
  }
})

test('las restricciones rechazan dueños inexistentes, IDs incoherentes, JSON inválido y orden negativo', async () => {
  await assert.rejects(insertar('trabajos', trabajo(), '33333333-3333-4333-8333-333333333333'), { code: '23503' })
  const invalidos = [
    ['trabajos', -1, { id: -1 }],
    ['trabajos', 9007199254740992, { id: 9007199254740992 }],
    ['trabajos', 1, { id: 2 }],
    ['trabajos', 1, { id: '1' }],
    ['trabajos', 1, {}],
    ['trabajos', 1, []],
    ['trabajos', 1, null],
    ['egresos', '', { id: '' }],
    ['egresos', 'e1', { id: 1 }],
    ['egresos', 'e1', { id: 'e2' }],
  ]
  for (const [tabla, id, datos] of invalidos) {
    await assert.rejects(db.query(`insert into public.${tabla} (usuario_id, id, datos) values ($1, $2, $3)`,
      [usuarioA, id, JSON.stringify(datos)]), { code: '23514' })
  }
  await assert.rejects(insertar('egresos', egreso(), usuarioA, -1), { code: '23514' })
})

test('el trigger real incrementa revisiones y detiene una actualización o eliminación desactualizada', async () => {
  await comoUsuario(usuarioA, async () => {
    for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
      await insertar(tabla, datos)
      // Incluso un cliente que intenta fijar la revisión no evita el incremento.
      const cambio = await db.query(`update public.${tabla} set revision = 99 where id = $1 and revision = 0 returning revision`, [datos.id])
      assert.equal(Number(cambio.rows[0].revision), 1)
      assert.equal((await db.query(`update public.${tabla} set datos = datos where id = $1 and revision = 0 returning id`, [datos.id])).rows.length, 0)
      assert.equal((await db.query(`delete from public.${tabla} where id = $1 and revision = 0 returning id`, [datos.id])).rows.length, 0)
      assert.equal((await db.query(`select revision from public.${tabla}`)).rows.length, 1)
    }
  })
})

test('los JSON de cuentas y pagos y las referencias históricas se conservan al borrar un trabajo', async () => {
  const datos = trabajo()
  datos.cuentasCobro = [{ id: 'c1', nombre: 'Cuenta', totalCentavos: 100000, pagos: [{
    id: 'p1', montoCentavos: 70000, fecha: '2026-11-16', medio: 'Transferencia', referencia: '', estado: 'Confirmado',
  }] }]
  await comoUsuario(usuarioA, async () => {
    await insertar('trabajos', datos)
    assert.deepEqual((await db.query('select datos from public.trabajos')).rows[0].datos, datos)
    await insertar('egresos', { ...egreso('segundo'), trabajoId: datos.id }, usuarioA, 1)
    await insertar('egresos', egreso('primero'), usuarioA, 0)
    await db.query('delete from public.trabajos where id = $1', [datos.id])
    const egresos = await db.query('select datos from public.egresos order by orden, id')
    assert.deepEqual(egresos.rows.map((r) => r.datos.id), ['primero', 'segundo'])
    assert.equal(egresos.rows[1].datos.trabajoId, 1)
  })
})

test('el borrado de una cuenta Auth elimina sus filas sin afectar a otra persona', async () => {
  for (const usuario of [usuarioA, usuarioB]) {
    await insertar('trabajos', trabajo(), usuario)
    await insertar('egresos', egreso(), usuario)
  }
  await db.query('delete from auth.users where id = $1', [usuarioA])
  for (const tabla of ['trabajos', 'egresos']) {
    const restantes = (await db.query(`select usuario_id from public.${tabla}`)).rows
    assert.deepEqual(restantes, [{ usuario_id: usuarioB }])
  }
})

test('reaplicar la migración de revisiones conserva datos y una revisión ya incrementada', async () => {
  await insertar('trabajos', trabajo())
  await insertar('egresos', egreso())
  await db.exec('update public.trabajos set datos = datos; update public.egresos set datos = datos;')
  await db.exec(revisiones)
  for (const tabla of ['trabajos', 'egresos']) {
    const filas = (await db.query(`select datos, revision from public.${tabla}`)).rows
    assert.equal(filas.length, 1)
    assert.equal(Number(filas[0].revision), 1)
  }
})

test('el esquema inicial se niega a ejecutarse sobre una instalación existente y conserva sus datos', async () => {
  const datos = trabajo()
  await insertar('trabajos', datos)
  await assert.rejects(db.exec(inicial), /solo para instalaciones nuevas/)
  await db.exec('rollback')
  const filas = (await db.query('select datos from public.trabajos')).rows
  assert.deepEqual(filas, [{ datos }])
})
