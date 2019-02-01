'use strict'

const Writable = require('stream').Writable
const agent = require('./agent')
const plugin = require('../../src/plugins/bunyan')

wrapIt()

describe('Plugin', () => {
  let logger
  let tracer
  let stream
  let span

  function setup (version) {
    const bunyan = require(`../../versions/bunyan@${version}`).get()

    span = tracer.startSpan('test')

    stream = new Writable()
    stream._write = () => {}

    sinon.spy(stream, 'write')

    logger = bunyan.createLogger({ name: 'test', stream })
  }

  describe('bunyan', () => {
    withVersions(plugin, 'bunyan', version => {
      beforeEach(() => {
        tracer = require('../..')
        return agent.load(plugin, 'bunyan')
      })

      afterEach(() => {
        return agent.close()
      })

      describe('without configuration', () => {
        beforeEach(() => {
          setup(version)
        })

        it('should not alter the default behavior', () => {
          tracer.scopeManager().activate(span)

          logger.info('message')

          expect(stream.write).to.have.been.called

          const record = JSON.parse(stream.write.firstCall.args[0].toString())

          expect(record).to.not.include({
            'dd.trace_id': span.context().toTraceId(),
            'dd.span_id': span.context().toSpanId()
          })
        })
      })

      describe('with configuration', () => {
        beforeEach(() => {
          tracer._tracer._logInjection = true
          setup(version)
        })

        it('should add the trace identifiers to logger instances', () => {
          tracer.scopeManager().activate(span)

          logger.info('message')

          expect(stream.write).to.have.been.called

          const record = JSON.parse(stream.write.firstCall.args[0].toString())

          expect(record).to.include({
            'dd.trace_id': span.context().toTraceId(),
            'dd.span_id': span.context().toSpanId()
          })
        })
      })
    })
  })
})
