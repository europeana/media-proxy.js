import sinon from 'sinon'

import healthRoute from '@/routes/health.js'

describe('@/routes/health.js', () => {
  it('sends status 200', () => {
    const req = {}
    const res = { sendStatus: sinon.spy() }

    healthRoute(req, res)

    expect(res.sendStatus.calledWith(200)).toBe(true)
  })
})
