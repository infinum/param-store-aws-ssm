import * as core from '@actions/core'
import * as main from '../src/main'
import { mockClient } from 'aws-sdk-client-mock'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
import { rmSync, readFileSync } from 'fs'

const runMock = jest.spyOn(main, 'run')

let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
const ssmClientMock = mockClient(SSMClient)

const OUTPUT_PARAM_FILE = 'params.txt'

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    ssmClientMock.reset()

    rmSync(OUTPUT_PARAM_FILE, { force: true })
  })

  it('sets the file output', async () => {
    ssmClientMock.on(GetParametersByPathCommand).resolves({
      Parameters: []
    })
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'path':
          return '/some/path'
        case 'file':
          return OUTPUT_PARAM_FILE
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
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
        case 'file':
          return OUTPUT_PARAM_FILE
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    const content = readFileSync(OUTPUT_PARAM_FILE, {
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
        case 'file':
          return OUTPUT_PARAM_FILE
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    const content = readFileSync(OUTPUT_PARAM_FILE, {
      encoding: 'utf8',
      flag: 'r'
    })
    expect(content).not.toContain('OTHER')
    expect(errorMock).not.toHaveBeenCalled()
  })
})
