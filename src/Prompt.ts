import {
  ParameterConstruct,
  ParsedParameters,
  StringifiedParameters,
  TypedParametersConstruct,
  ParameterError,
} from 'construct-typed-parameters';
import { SsmEnvClient } from './SsmEnvClient.js';
import inquirer from 'inquirer';

export class Prompt<T extends Record<string, ParameterConstruct<any>>> {
  private defaultParameters: ParsedParameters<T>;
  constructor(
    private parametersConstruct: TypedParametersConstruct<T>,
    private client: SsmEnvClient
  ) {
    this.defaultParameters = parametersConstruct.parse({}, false);
  }

  async interact(): Promise<{
    envName: string;
    stringifiedParameters: StringifiedParameters<T>;
    parsedParameters: ParsedParameters<T>;
  }> {
    const envList = await this.client.loadEnvList();
    const envName = await this.selectOrInputEnv(envList);
    const isNewEnv = !envList.includes(envName);
    if (isNewEnv) {
      await this.client.putEnv(envName);
    }

    const parsedParameters = await (isNewEnv
      ? this.editParameters({})
      : this.askAndEditParameters(
          this.parametersConstruct.parse(
            (await this.client.loadParameters(
              envName
            )) as StringifiedParameters<T>,
            false
          )
        ));
    const stringifiedParameters =
      this.parametersConstruct.stringify(parsedParameters);

    await this.client.syncParameters(envName, stringifiedParameters);

    return { stringifiedParameters, parsedParameters, envName };
  }

  private async selectOrInputEnv(envList: string[]) {
    const NEW_ENVIRONMENT = '- create a new environment -';
    const { selectedEnvName } = await inquirer.prompt<{
      selectedEnvName: string;
    }>({
      type: 'list',
      name: 'selectedEnvName',
      message: 'Select an environment to deploy',
      choices: [...envList, NEW_ENVIRONMENT],
    });
    if (selectedEnvName === NEW_ENVIRONMENT) {
      const { newEnvName } = await inquirer.prompt<{ newEnvName: string }>({
        type: 'input',
        name: 'newEnvName',
        message: 'Please enter an environment name.',
        validate: input => !!input, // required check.
      });
      return newEnvName;
    }
    return selectedEnvName;
  }

  private validateParameters(parsedParameters: any) {
    try {
      this.parametersConstruct.stringify(
        parsedParameters as ParsedParameters<T>,
        true
      );
    } catch (e) {
      if (e instanceof ParameterError) {
        return e.message;
      }
      throw e;
    }
    return true; // valid
  }

  private async editParameters(currentParsedParameters: Record<string, any>) {
    const { newInput } = await inquirer.prompt<{ newInput: string }>({
      type: 'editor',
      name: 'newInput',
      message: 'Edit parameters',
      default: this.format({
        ...this.defaultParameters,
        ...currentParsedParameters,
      }),
      validate: input => {
        try {
          return this.validateParameters(JSON.parse(input as string));
        } catch (e) {
          if (e instanceof SyntaxError) {
            return e.message; // JSON.parse Error
          }
          throw e;
        }
      },
    });
    const newParsedParameters = JSON.parse(newInput) as ParsedParameters<T>;
    console.log(this.format(newParsedParameters));
    return newParsedParameters;
  }

  private async askAndEditParameters(
    currentParsedParameters: Record<string, any>
  ): Promise<ParsedParameters<T>> {
    if (this.validateParameters(currentParsedParameters) !== true) {
      console.log('Parameters Construct has been changed');
      return this.editParameters(currentParsedParameters);
    }

    const _askAndEditParameters: (
      beforeParameters: ParsedParameters<T>
    ) => Promise<ParsedParameters<T>> = async beforeParameters => {
      const SHOW = 'show current parameters';
      const CHANGE = 'change parameters';
      const CONTINUE = 'without change, continue';
      const { action } = await inquirer.prompt<{ action: string }>({
        type: 'list',
        name: 'action',
        message: 'Do you want to change the parameters?',
        choices: [SHOW, CHANGE, CONTINUE],
      });
      if (action === SHOW) {
        console.log(this.format(beforeParameters));
        return _askAndEditParameters(beforeParameters);
      } else if (action === CHANGE) {
        const newParameters = await this.editParameters(beforeParameters);
        return _askAndEditParameters(newParameters);
      }
      return beforeParameters;
    };
    return _askAndEditParameters({
      ...this.defaultParameters,
      ...currentParsedParameters,
    });
  }

  private format(currentParameters: ParsedParameters<T>) {
    return JSON.stringify(currentParameters, null, 2);
  }
}
