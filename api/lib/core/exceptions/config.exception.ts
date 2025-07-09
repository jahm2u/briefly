/**
 * Custom exception for configuration-related errors
 */
export class ConfigException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigException';
  }
}
