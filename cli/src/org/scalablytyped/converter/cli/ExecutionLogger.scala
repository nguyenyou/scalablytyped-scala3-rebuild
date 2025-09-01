package org.scalablytyped.converter.cli

import fansi.Str
import org.scalablytyped.converter.internal.logging.*
import sourcecode.Text

import java.io.FileWriter
import java.io.PrintWriter
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/** Dedicated execution logging module for CLI applications. Provides comprehensive logging with sequential step
  * numbering, timestamps, and human-readable output to both console and file.
  */
class ExecutionLogger(logFilePath: os.Path, workingDirectory: os.Path, outputDirectory: os.Path) {

  // Step counter for sequential numbering
  private var stepCounter = 0

  // Custom pattern for execution logs (human-readable, no colors)
  object ExecutionLogPattern extends Pattern {
    private val timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

    override def apply[T: Formatter](t: => Text[T], throwable: Option[Throwable], metadata: Metadata, ctx: Ctx): Str = {
      val timestamp     = LocalDateTime.now().format(timeFormatter)
      val message       = Formatter(t.value).plainText
      val throwableText = throwable.map(th => s"\nERROR: ${th.getMessage}").getOrElse("")

      val showTimestamp = false
      if (showTimestamp) {
        Str(s"[$timestamp] $message$throwableText")
      } else {
        Str(s"$message$throwableText")
      }
    }
  }

  // File-based execution logger
  private lazy val executionLogWriter =
    new PrintWriter(new FileWriter(logFilePath.toIO, false)) // false = overwrite
  private lazy val executionLogger: Logger[PrintWriter] = {
    writer(executionLogWriter, ExecutionLogPattern)
  }

  // Combined logger that writes to both console and execution log
  private lazy val combinedLogger: Logger[(PrintWriter, Unit)] =
    executionLogger.zipWith(stdout)

  /** Log a major execution step with automatic sequential numbering.
    * @param message
    *   Description of the step being performed
    */
  def logStep(message: String): Unit = {
    stepCounter += 1
    val stepMessage = s"Step $stepCounter: $message"
    combinedLogger.info(Text(stepMessage))
  }

  /** Log progress within a step with indentation.
    * @param message
    *   Progress description
    */
  def logProgress(message: String): Unit = {
    combinedLogger.info(Text(s"  → $message"))
  }

  /** Log an error message with optional exception details.
    * @param message
    *   Error description
    * @param throwable
    *   Optional exception that caused the error
    */
  def logError(message: String, throwable: Option[Throwable] = None): Unit = {
    throwable match {
      case Some(th) => combinedLogger.error(Text(message), th)
      case None     => combinedLogger.error(Text(message))
    }
  }

  /** Log a warning message.
    * @param message
    *   Warning description
    */
  def logWarning(message: String): Unit = {
    combinedLogger.warn(Text(message))
  }

  /** Initialize the execution log with header information. Should be called at the start of execution.
    */
  def initializeExecutionLog(): Unit = {
    stepCounter = 0
    val startTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
    executionLogWriter.println("=== ScalablyTyped Converter Execution Log ===")
    executionLogWriter.println(s"Started at: $startTime")
    executionLogWriter.println(s"Working directory: $workingDirectory")
    executionLogWriter.println(s"Output directory: $outputDirectory")
    executionLogWriter.println("=" * 50)
    executionLogWriter.println()
    executionLogWriter.flush()
  }

  /** Finalize the execution log with footer information and close resources. Should be called at the end of execution.
    * @param success
    *   Whether the execution completed successfully
    */
  def finalizeExecutionLog(success: Boolean): Unit = {
    val endTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
    executionLogWriter.println()
    executionLogWriter.println("=" * 50)
    executionLogWriter.println(s"Execution ${if (success) "completed successfully" else "failed"} at: $endTime")
    executionLogWriter.println(s"Total steps executed: $stepCounter")
    executionLogWriter.close()
  }

  /** Get the current step count.
    * @return
    *   Current step number
    */
  def getCurrentStepCount: Int = stepCounter
}

/** Companion object providing factory methods for ExecutionLogger.
  */
object ExecutionLogger {

  /** Create an ExecutionLogger with default log file name in the working directory.
    * @param workingDirectory
    *   The working directory where the log file will be created
    * @param outputDirectory
    *   The output directory for generated files
    * @return
    *   A new ExecutionLogger instance
    */
  def apply(workingDirectory: os.Path, outputDirectory: os.Path): ExecutionLogger = {
    val logFilePath = workingDirectory / "execution-logs.txt"
    new ExecutionLogger(logFilePath, workingDirectory, outputDirectory)
  }

  /** Create an ExecutionLogger with a custom log file path.
    * @param logFilePath
    *   Custom path for the log file
    * @param workingDirectory
    *   The working directory
    * @param outputDirectory
    *   The output directory for generated files
    * @return
    *   A new ExecutionLogger instance
    */
  def withCustomPath(logFilePath: os.Path, workingDirectory: os.Path, outputDirectory: os.Path): ExecutionLogger = {
    new ExecutionLogger(logFilePath, workingDirectory, outputDirectory)
  }
}
