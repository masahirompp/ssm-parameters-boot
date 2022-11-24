/* eslint-disable @typescript-eslint/naming-convention */
import type {
  ParameterConstruct,
  ParsedParameters,
  StringifiedParameters,
  TypedParameters} from 'construct-typed-parameters';
import {
  ParameterError,
} from 'construct-typed-parameters';
import inquirer from 'inquirer';
import type {SsmEnvClient} from 'ssm-env-client';

export class EditParametersPrompt<T extends Record<string, ParameterConstruct<any>>> {
  private readonly defaultParameters: ParsedParameters<T>;
  constructor(
    private readonly parametersConstruct: TypedParameters<T>,
    private readonly client: SsmEnvClient,
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
      ? this.editParameters(this.defaultParameters)
      : this.askAndEditParameters(
        this.parametersConstruct.parse(
          (await this.client.loadParameters(
            envName,
          )) as StringifiedParameters<T>,
          false,
        ),
      ));
    const stringifiedParameters
      = this.parametersConstruct.stringify(parsedParameters);

    await this.client.putParameters(envName, stringifiedParameters);

    return {stringifiedParameters, parsedParameters, envName};
  }

  private async selectOrInputEnv(envList: string[]) {
    const NEW_ENVIRONMENT = '- create a new environment -';
    const {selectedEnvName} = await inquirer.prompt<{
      selectedEnvName: string;
    }>({
      type: 'list',
      loop: false,
      name: 'selectedEnvName',
      message: 'Select an environment:',
      choices: [...envList, NEW_ENVIRONMENT],
    });
    if (selectedEnvName === NEW_ENVIRONMENT) {
      const {newEnvName} = await inquirer.prompt<{newEnvName: string}>({
        type: 'input',
        name: 'newEnvName',
        message: 'Please enter an environment name:',
        validate: Boolean, // Required check.
      });
      return newEnvName;
    }

    return selectedEnvName;
  }

  private validateParameters(parsedParameters: any) {
    try {
      this.parametersConstruct.stringify(
        parsedParameters as ParsedParameters<T>,
        true,
      );
    } catch (error: unknown) {
      if (error instanceof ParameterError) {
        return error.message;
      }

      throw error;
    }

    return true; // Valid
  }

  private async editParameters(currentParsedParameters: Record<string, any>) {
    const {newInput} = await inquirer.prompt<{newInput: string}>({
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
        } catch (error: unknown) {
          if (error instanceof SyntaxError) {
            return error.message; // JSON.parse Error
          }

          throw error;
        }
      },
    });
    const newParsedParameters = JSON.parse(newInput) as ParsedParameters<T>;
    console.log(this.format(newParsedParameters));
    return newParsedParameters;
  }

  private async askAndEditParameters(
    currentParsedParameters: Record<string, any>,
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
      const {action} = await inquirer.prompt<{action: string}>({
        type: 'list',
        loop: false,
        name: 'action',
        message: 'Do you want to change the parameters?',
        choices: [SHOW, CHANGE, CONTINUE],
      });
      if (action === SHOW) {
        console.log(this.format(beforeParameters));
        return _askAndEditParameters(beforeParameters);
      }

      if (action === CHANGE) {
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
