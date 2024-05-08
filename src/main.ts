import * as core from '@actions/core'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
import { writeFileSync } from 'fs'

const EMPTY_STRING = ''
const NEWLINE = '\n'
const PARAMETER_VALUE_NULL = 'null'
const FILE_FLAG_WRITE = 'w'
export const PARAMS_FILE = 'params.txt'
export const OUTPUT_PARAM_FILE = 'file'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const path: string = core.getInput('path')

    const client = new SSMClient()
    const input = {
      Path: path,
      WithDecryption: true
    }
    const command = new GetParametersByPathCommand(input)
    const response = await client.send(command)

    let paramItems: string[] = []
    if (response.Parameters !== undefined) {
      paramItems = response.Parameters.map((parameter): string => {
        if (parameter.Name) {
          const paramItemName = parameter.Name.replace(
            path,
            EMPTY_STRING
          ).toUpperCase()

          if (parameter.Value === PARAMETER_VALUE_NULL) {
            return EMPTY_STRING
          } else {
            return `${paramItemName}=${parameter.Value}`
          }
        } else {
          return EMPTY_STRING
        }
      }).filter(paramItem => paramItem !== EMPTY_STRING)
    }

    writeFileSync(PARAMS_FILE, paramItems.join(NEWLINE), {
      flag: FILE_FLAG_WRITE
    })
    core.setOutput(OUTPUT_PARAM_FILE, PARAMS_FILE)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
