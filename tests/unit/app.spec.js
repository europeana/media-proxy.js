import app from '@/app.js'

describe('@/app.js', () => {
  it('disables x-powered-by', () => {
    expect(app.settings['x-powered-by']).toBe(false)
  })

  it('registers logger middleware', () => {
    expect(app['_router'].stack.some((handler) => handler.name === 'logger')).toBe(true)
  })

  it('registers CORS middleware', () => {
    expect(app['_router'].stack.some((handler) => handler.name === 'corsMiddleware')).toBe(true)
  })

  it('registers root path route', () => {
    expect(app['_router'].stack.some((handler) => handler.route?.path === '/')).toBe(true)
  })

  it('registers /media/:datasetId/:localId/:webResourceHash? path route', () => {
    expect(app['_router'].stack.some((handler) => handler.route?.path === '/media/:datasetId/:localId/:webResourceHash?')).toBe(true)
  })
})
