import * as core from '@actions/core'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
import type { Parameter, GetParametersByPathResult } from '@aws-sdk/client-ssm'
import { writeFileSync } from 'fs'

const EMPTY_STRING = ''
const NEWLINE = '\n'
const PARAMETER_VALUE_NULL = 'null'
const FILE_FLAG_WRITE = 'w'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const path: string = core.getInput('path')
    const file: string = core.getInput('file')

    const parameters = await fetchParameters(path)
    const paramItems = parameters
      .map(parameter => parameterToEnvItem(parameter, path))
      .filter(paramItem => paramItem !== EMPTY_STRING)

    writeFileSync(file, paramItems.join(NEWLINE), {
      flag: FILE_FLAG_WRITE
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function fetchParameters(path: string): Promise<Parameter[]> {
  const client = new SSMClient()
  let parameters: Parameter[] = []
  let batchIndex = 1
  let nextToken: string | undefined = undefined
  let response: GetParametersByPathResult

  do {
    response = await fetchParameterBatch(client, path, nextToken, batchIndex)
    if (response.Parameters)
      parameters = [...parameters, ...response.Parameters]
    nextToken = response.NextToken
    batchIndex++
  } while (nextToken)

  return parameters
}

async function fetchParameterBatch(
  client: SSMClient,
  path: string,
  nextToken: string | undefined,
  batchIndex: number
): Promise<GetParametersByPathResult> {
  const input = {
    Path: path,
    WithDecryption: true,
    NextToken: nextToken
  }

  core.debug(`Fetching parameters batch: ${batchIndex}`)
  const command = new GetParametersByPathCommand(input)
  return await client.send(command)
}

function parameterToEnvItem(parameter: Parameter, path: string): string {
  if (!parameter.Name) return EMPTY_STRING

  const paramItemName = parameter.Name.replace(path, EMPTY_STRING).toUpperCase()

  if (parameter.Value === PARAMETER_VALUE_NULL) {
    core.debug(`[${parameter.Name}]: null value detected, skip`)
    return EMPTY_STRING
  } else {
    return `${paramItemName}=${parameter.Value}`
  }
}
