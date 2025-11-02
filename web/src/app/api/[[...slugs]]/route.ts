// Lazy load backend to avoid bundling issues
let app: any

async function getApp() {
  if (!app) {
    app = await import('backend').then(m => m.default)
  }
  return app
}

export const GET = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const POST = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const PUT = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const PATCH = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const DELETE = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const OPTIONS = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}

export const HEAD = async (req: Request) => {
  const backend = await getApp()
  return backend.fetch(req)
}
