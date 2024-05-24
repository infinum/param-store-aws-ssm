import * as core from '@actions/core'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
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
