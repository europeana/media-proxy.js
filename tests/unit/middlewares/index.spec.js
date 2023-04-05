import middlewareIndex from '@/middlewares/index.js'

describe('@/middlewares/index.js', () => {
  it('exports all custom middlewares', () => {
    expect(middlewareIndex.cors).toBeTruthy()
    expect(middlewareIndex.logging).toBeTruthy()
    expect(middlewareIndex.webResourceProxy).toBeTruthy()
  })
})
