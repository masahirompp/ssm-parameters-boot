import type {ParameterConstruct, TypedParameters} from 'construct-typed-parameters';
import {EditParametersPrompt} from './edit-parameters-prompt.js';
import type {SsmEnvClientOption} from './ssm-env-client.js';
import {SsmEnvClient} from './ssm-env-client.js';

type BootstrapOptions<T extends Record<string, ParameterConstruct<any>>> = Omit<SsmEnvClientOption, 'secureParameterNames'> & {
  secureParameterNames?: Array<keyof T & string>;
};

export const bootstrap = async <
  T extends Record<string, ParameterConstruct<any>>,
>(
  serviceName: string,
  parametersConstruct: TypedParameters<T>,
  options: BootstrapOptions<T>,
) => {
  if (!serviceName) {
    throw new Error('serviceName is required.');
  }

  return new EditParametersPrompt(
    parametersConstruct,
    new SsmEnvClient(serviceName, options),
  ).interact();
};
