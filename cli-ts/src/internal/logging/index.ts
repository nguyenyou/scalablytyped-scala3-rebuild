/**
 * Logging interface for the phases framework
 * Port of the Scala logging system
 */

/**
 * Generic logger interface
 */
export interface Logger<T> {
	/**
	 * Log an info message
	 */
	info(message: string, ...args: any[]): T;

	/**
	 * Log a warning message
	 */
	warn(message: string, ...args: any[]): T;

	/**
	 * Log an error message
	 */
	error(message: string, error?: Error): T;

	/**
	 * Log a debug message
	 */
	debug(message: string, ...args: any[]): T;

	/**
	 * Log a fatal error and throw an exception
	 */
	fatal(message: string, ...args: any[]): never;

	/**
	 * Create a new logger with additional context
	 */
	withContext(key: string, value: any): Logger<T>;

	/**
	 * Conditionally log fatal or warn based on pedantic flag
	 */
	fatalMaybe(message: string, pedantic: boolean, ...args: any[]): T;
}

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements Logger<void> {
	constructor(
		private prefix: string = "",
		private context: Record<string, any> = {},
	) {}

	info(message: string, ...args: any[]): void {
		console.log(`${this.prefix}[INFO] ${this.formatMessage(message)}`, ...args);
	}

	warn(message: string, ...args: any[]): void {
		console.warn(
			`${this.prefix}[WARN] ${this.formatMessage(message)}`,
			...args,
		);
	}

	error(message: string, error?: Error): void {
		if (error) {
			console.error(
				`${this.prefix}[ERROR] ${this.formatMessage(message)}`,
				error,
			);
		} else {
			console.error(`${this.prefix}[ERROR] ${this.formatMessage(message)}`);
		}
	}

	debug(message: string, ...args: any[]): void {
		console.debug(
			`${this.prefix}[DEBUG] ${this.formatMessage(message)}`,
			...args,
		);
	}

	fatal(message: string, ...args: any[]): never {
		const formattedMessage = `${this.prefix}[FATAL] ${this.formatMessage(message)}`;
		console.error(formattedMessage, ...args);
		throw new LoggedException(formattedMessage);
	}

	withContext(key: string, value: any): Logger<void> {
		return new ConsoleLogger(this.prefix, { ...this.context, [key]: value });
	}

	fatalMaybe(message: string, pedantic: boolean, ...args: any[]): void {
		if (pedantic) {
			this.fatal(message, ...args);
		} else {
			this.warn(message, ...args);
		}
	}

	private formatMessage(message: string): string {
		const contextStr =
			Object.keys(this.context).length > 0
				? ` [${Object.entries(this.context)
						.map(([k, v]) => `${k}=${v}`)
						.join(", ")}]`
				: "";
		return `${message}${contextStr}`;
	}
}

/**
 * No-op logger that discards all messages
 */
export class DevNullLogger implements Logger<void> {
	info(_message: string, ..._args: any[]): void {
		// Do nothing
	}

	warn(_message: string, ..._args: any[]): void {
		// Do nothing
	}

	error(_message: string, _error?: Error): void {
		// Do nothing
	}

	debug(_message: string, ..._args: any[]): void {
		// Do nothing
	}

	fatal(message: string, ..._args: any[]): never {
		throw new LoggedException(message);
	}

	withContext(_key: string, _value: any): Logger<void> {
		return new DevNullLogger();
	}

	fatalMaybe(message: string, pedantic: boolean, ..._args: any[]): void {
		if (pedantic) {
			this.fatal(message);
		}
		// Otherwise do nothing (warn is no-op)
	}
}

/**
 * Logger that collects messages for testing
 */
export class CollectingLogger implements Logger<void> {
	private messages: Array<{
		level: string;
		message: string;
		args: any[];
		error?: Error;
	}> = [];
	private context: Record<string, any> = {};

	constructor(context: Record<string, any> = {}) {
		this.context = context;
	}

	info(message: string, ...args: any[]): void {
		this.messages.push({
			level: "INFO",
			message: this.formatMessage(message),
			args,
		});
	}

	warn(message: string, ...args: any[]): void {
		this.messages.push({
			level: "WARN",
			message: this.formatMessage(message),
			args,
		});
	}

	error(message: string, error?: Error): void {
		this.messages.push({
			level: "ERROR",
			message: this.formatMessage(message),
			args: [],
			error,
		});
	}

	debug(message: string, ...args: any[]): void {
		this.messages.push({
			level: "DEBUG",
			message: this.formatMessage(message),
			args,
		});
	}

	fatal(message: string, ...args: any[]): never {
		const formattedMessage = this.formatMessage(message);
		this.messages.push({ level: "FATAL", message: formattedMessage, args });
		throw new LoggedException(formattedMessage);
	}

	withContext(key: string, value: any): Logger<void> {
		return new CollectingLogger({ ...this.context, [key]: value });
	}

	fatalMaybe(message: string, pedantic: boolean, ...args: any[]): void {
		if (pedantic) {
			this.fatal(message, ...args);
		} else {
			this.warn(message, ...args);
		}
	}

	private formatMessage(message: string): string {
		const contextStr =
			Object.keys(this.context).length > 0
				? ` [${Object.entries(this.context)
						.map(([k, v]) => `${k}=${v}`)
						.join(", ")}]`
				: "";
		return `${message}${contextStr}`;
	}

	getMessages(): Array<{
		level: string;
		message: string;
		args: any[];
		error?: Error;
	}> {
		return [...this.messages];
	}

	clear(): void {
		this.messages = [];
	}

	get size(): number {
		return this.messages.length;
	}
}

/**
 * Factory functions for common loggers
 */
export const Logger = {
	/**
	 * Creates a console logger
	 */
	Console: (prefix: string = ""): Logger<void> => new ConsoleLogger(prefix),

	/**
	 * Creates a dev null logger
	 */
	DevNull: (): Logger<void> => new DevNullLogger(),

	/**
	 * Creates a collecting logger for testing
	 */
	Collecting: (): CollectingLogger => new CollectingLogger(),
};

/**
 * Custom exception for logged errors
 */
export class LoggedException extends Error {
	constructor(
		message: string,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "LoggedException";
	}
}
