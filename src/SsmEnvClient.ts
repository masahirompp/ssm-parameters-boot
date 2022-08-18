import path from 'node:path';
import {
  AddTagsToResourceCommand,
  DeleteParametersCommand,
  GetParametersByPathCommand,
  Parameter,
  ParameterType,
  PutParameterCommand,
  PutParameterCommandInput,
  ResourceTypeForTagging,
  SSMClient,
  SSMClientConfig,
  Tag,
} from '@aws-sdk/client-ssm';

export type SsmEnvClientOption = {
  tagKeyPrefix?: string;
  ssmClientConfig?: SSMClientConfig;
  ssmBasePath?: string;
  kmsKeyId?: string;
  secureParameterNames?: string[];
};

export class SsmEnvClient {
  private readonly basePath: string;
  private readonly ssmClient;
  private readonly envListPath;
  private readonly tagKeyPrefix;
  private readonly kmsKeyId;
  private readonly secureParameterNames;
  constructor(
    private serviceName: string,
    private option?: SsmEnvClientOption
  ) {
    this.basePath = option?.ssmBasePath || '/';
    if (!this.basePath.startsWith('/')) {
      throw new Error("option.ssmBasePath must start with '/'");
    }

    this.ssmClient = new SSMClient(option?.ssmClientConfig || {});
    this.envListPath = path.join(this.basePath, `${this.serviceName}_ENV_LIST`);
    this.tagKeyPrefix = this.option?.tagKeyPrefix || '';
    this.kmsKeyId = this.option?.kmsKeyId;
    this.secureParameterNames = this.option?.secureParameterNames || [];
  }

  async loadEnvList() {
    const envParameters = await this.getParametersByPath(this.envListPath);
    return envParameters
      .map(p => p.Name)
      .filter((envNamePath): envNamePath is string => !!envNamePath)
      .map(envNamePath => envNamePath.substring(`${this.envListPath}/`.length));
  }

  async putEnv(envName: string) {
    return this.putParameter(
      path.join(this.envListPath, envName),
      new Date().toISOString(),
      false,
      { Overwrite: false, Tags: this.makeTags(envName) }
    );
  }

  async loadParameters(envName: string) {
    const path = this.makeParameterPath(envName);
    const parameters = await this.getParametersByPath(path);
    return parameters.reduce<Record<string, string | undefined>>(
      (payload, parameter) => {
        return {
          ...payload,
          ...(parameter.Name
            ? { [parameter.Name.substring(`${path}/`.length)]: parameter.Value }
            : {}),
        };
      },
      {}
    );
  }

  async syncParameters(envName: string, newParameters: Record<string, string>) {
    const currentParameters = await this.loadParameters(envName);
    const putKeys: string[] = [];
    const removeKeys: string[] = [];
    Object.keys(newParameters).forEach(key => {
      if (key in currentParameters === false) {
        putKeys.push(key); // new key
      }
    });
    Object.keys(currentParameters).forEach(key => {
      if (key in newParameters) {
        if (currentParameters[key] !== newParameters[key]) {
          putKeys.push(key); // modified key
        }
      } else {
        removeKeys.push(key); // remove key
      }
    });
    const Tags = this.makeTags(envName);
    await Promise.all([
      ...putKeys.map(key =>
        this.putParameter(
          this.makeParameterPath(envName, key),
          newParameters[key],
          this.secureParameterNames.includes(key),
          { Overwrite: true, Tags }
        )
      ),
      removeKeys.length &&
        this.removeParameters(
          removeKeys.map(key => this.makeParameterPath(envName, key))
        ),
    ]);
  }

  private makeTags(envName: string): Tag[] {
    return [
      { Key: `${this.tagKeyPrefix}SERVICE`, Value: this.serviceName },
      { Key: `${this.tagKeyPrefix}ENV`, Value: envName },
    ];
  }

  private makeParameterPath(envName: string, parameterName?: string) {
    return path.join(
      this.basePath,
      this.serviceName,
      envName,
      parameterName || ''
    );
  }

  private putParameter(
    path: string,
    value: string,
    secure = false,
    option: Omit<PutParameterCommandInput, 'Type' | 'Name' | 'Value'> = {}
  ) {
    const overwriteTags =
      option.Overwrite === true && option.Tags?.length ? option.Tags : [];
    if (overwriteTags.length) {
      delete option.Tags;
    }

    return this.ssmClient
      .send(
        new PutParameterCommand({
          Type: secure ? ParameterType.SECURE_STRING : ParameterType.STRING,
          Name: path,
          Value: value,
          KeyId: secure ? this.kmsKeyId : undefined,
          ...option,
        })
      )
      .then(async r => {
        if (overwriteTags.length) {
          await this.ssmClient.send(
            new AddTagsToResourceCommand({
              ResourceId: path, // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ssm/interfaces/addtagstoresourcecommandinput.html
              ResourceType: ResourceTypeForTagging.PARAMETER,
              Tags: overwriteTags,
            })
          );
        }
        return r;
      });
  }

  private removeParameters(pathList: string[]) {
    return this.ssmClient.send(
      new DeleteParametersCommand({ Names: pathList })
    );
  }

  private getParametersByPath(path: string) {
    const loadParameters: (
      path: string,
      nextToken?: string
    ) => Promise<Array<Parameter>> = async (path, nextToken) => {
      const { Parameters, NextToken } = await this.ssmClient.send(
        new GetParametersByPathCommand({
          Path: path,
          NextToken: nextToken,
          WithDecryption: this.secureParameterNames.length > 0,
        })
      );
      if (!Parameters) {
        return [];
      }
      if (NextToken) {
        return [...Parameters, ...(await loadParameters(path, nextToken))];
      }
      return Parameters;
    };
    return loadParameters(path);
  }
}
