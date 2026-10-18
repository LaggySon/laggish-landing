// Vercel function. vercel.json rewrites every page here.
import { handle } from "../lib/router.js"

export const GET = (request) => handle(request)
