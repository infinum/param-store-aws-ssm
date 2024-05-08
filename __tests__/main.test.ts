import * as core from '@actions/core'
import * as main from '../src/main'
import { mockClient } from 'aws-sdk-client-mock'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
import { rmSync, readFileSync } from 'fs'

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>
const ssmClientMock = mockClient(SSMClient)

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    ssmClientMock.reset()

    rmSync(main.OUTPUT_PARAM_FILE, { force: true })
  })

  it('sets the file output', async () => {
    ssmClientMock.on(GetParametersByPathCommand).resolves({
      Parameters: []
    })
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'path':
          return '/some/path'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setOutputMock).toHaveBeenNthCalledWith(
      1,
      main.OUTPUT_PARAM_FILE,
      main.PARAMS_FILE
    )
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('creates params file', async () => {
    ssmClientMock.on(GetParametersByPathCommand).resolves({
      Parameters: [{ Name: 'param', Value: 'value' }]
    })
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'path':
          return '/some/path'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    const content = readFileSync(main.PARAMS_FILE, {
      encoding: 'utf8',
      flag: 'r'
    })
    expect(content).toEqual('PARAM=value')
  })

  it('skips parameters with null values', async () => {
    ssmClientMock.on(GetParametersByPathCommand).resolves({
      Parameters: [
        { Name: 'param', Value: 'value' },
        { Name: 'other', Value: 'null' }
      ]
    })
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'path':
          return '/some/path'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    const content = readFileSync(main.PARAMS_FILE, {
      encoding: 'utf8',
      flag: 'r'
    })
    expect(content).not.toContain('OTHER')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
