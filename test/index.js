import micro from 'micro'
import test from 'ava'
import listen from 'test-listen'
import request from 'request-promise'

test('it works', async t => {
    const service = micro(async (req, res) => {
        micro.send(res, 200, {
            test: 'woot'
        })
    })

    const url = await listen(service)
    const body = await request(url)

    t.deepEqual(JSON.parse(body).test, 'woot')
})
