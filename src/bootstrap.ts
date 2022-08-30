import type {ParameterConstruct, TypedParameters} from 'construct-typed-parameters';
import type {SsmEnvClient} from 'ssm-env-client';
import {EditParametersPrompt} from './edit-parameters-prompt.js';

export const bootstrap = async <
  T extends Record<string, ParameterConstruct<any>>,
>(
  parametersConstruct: TypedParameters<T>,
  ssmClient: SsmEnvClient,
) => new EditParametersPrompt(
  parametersConstruct,
  ssmClient,
).interact();
