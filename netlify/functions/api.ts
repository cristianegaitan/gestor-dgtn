import serverless from 'serverless-http'
import { crearApp } from '../../server/app.ts'

export const handler = serverless(crearApp())
