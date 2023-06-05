import routeIndex from '@/routes/index.js'

describe('@/routes/index.js', () => {
  it('exports all custom routes', () => {
    expect(routeIndex.health).toBeTruthy()
    expect(routeIndex.legacy).toBeTruthy()
    expect(routeIndex.media).toBeTruthy()
  })
})
