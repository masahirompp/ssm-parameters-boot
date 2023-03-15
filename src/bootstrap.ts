import type {ParameterConstruct, TypedParameters} from 'construct-typed-parameters';
import type {SsmEnvClientOption} from 'ssm-env-client';
import {SsmEnvClient} from 'ssm-env-client';
import {EditParametersPrompt} from './edit-parameters-prompt.js';

export const bootstrap = async <
  T extends Record<string, ParameterConstruct<any>>,
>(
  serviceName: string,
  parametersConstruct: TypedParameters<T>,
  option?: SsmEnvClientOption & {envName?: string},
) => new EditParametersPrompt(
  parametersConstruct,
  new SsmEnvClient(serviceName, option),
).interact(option?.envName);
