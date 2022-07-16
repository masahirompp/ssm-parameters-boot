import {
  ParameterConstruct,
  ParsedParameters,
  StringifiedParameters,
  TypedParameters,
} from 'construct-typed-parameters';
import { Prompt } from './Prompt.js';
import { SsmEnvClient, SsmEnvClientOption } from './SsmEnvClient.js';

export const bootstrap = async <
  T extends Record<string, ParameterConstruct<any>>
>(
  serviceName: string,
  parametersConstruct: TypedParameters<T>,
  options: SsmEnvClientOption & {
    onEnded?: (args: {
      envName: string;
      stringifiedParameters: StringifiedParameters<T>;
      parsedParameters: ParsedParameters<T>;
    }) => Promise<void> | void;
  } = {}
) => {
  if (!serviceName) {
    throw Error('serviceName is required.');
  }
  const { onEnded, ...ssmEnvClientOption } = options;

  const result = await new Prompt(
    parametersConstruct,
    new SsmEnvClient(serviceName, ssmEnvClientOption)
  ).interact();

  if (onEnded) {
    await onEnded(result);
  }

  return 0;
};
