import type {
  ParameterConstruct,
  ParsedParameters,
  StringifiedParameters,
  TypedParameters,
} from 'construct-typed-parameters';
import {EditParametersPrompt} from './edit-parameters-prompt.js';
import type {SsmEnvClientOption} from './ssm-env-client.js';
import {SsmEnvClient} from './ssm-env-client.js';

export const bootstrap = async <
  T extends Record<string, ParameterConstruct<any>>,
>(
  serviceName: string,
  parametersConstruct: TypedParameters<T>,
  options: SsmEnvClientOption & {
    onEnded?: (args: {
      envName: string;
      stringifiedParameters: StringifiedParameters<T>;
      parsedParameters: ParsedParameters<T>;
    }) => Promise<void> | void;
  } = {},
) => {
  if (!serviceName) {
    throw new Error('serviceName is required.');
  }

  const {onEnded, ...ssmEnvClientOption} = options;

  const result = await new EditParametersPrompt(
    parametersConstruct,
    new SsmEnvClient(serviceName, ssmEnvClientOption),
  ).interact();

  if (onEnded) {
    await onEnded(result);
  }

  return 0;
};
