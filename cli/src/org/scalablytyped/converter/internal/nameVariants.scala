package org.scalablytyped.converter.internal

object nameVariants {
  sealed trait NameVariant
  case object Clean                extends NameVariant
  case class KeepSymbolNum(n: Int) extends NameVariant
  case object Unchanged            extends NameVariant

  /* you would be surprised what shows up */
  private val WordBoundary = Set[Char]('.', ',', ':', ';', '?', '!', ' ', '\t', '\n', '-', '_', '/')

  def apply(value: String): LazyList[String] =
    if (value.forall(c => c.isUpper || c === '_' || c.isDigit)) LazyList(value)
    else {
      val variants: LazyList[NameVariant] =
        value.count(c => !c.isLetterOrDigit) match {
          case 0 => LazyList(Unchanged)
          case 1 => LazyList(Clean, Unchanged)
          case n => LazyList(Clean) #::: LazyList.range[Int](0, n + 1).map(KeepSymbolNum.apply) #::: LazyList(Unchanged)
        }
      variants.map(rewrite(value))
    }

  def rewrite(value: String)(variant: NameVariant): String = {
    def keepSymbolNum(n: Int): String = {
      val sb              = new StringBuilder(value.length)
      var i               = 0
      var s               = 0
      var wasWordboundary = false
      while (i < value.length) {
        val c = value(i)
        if (c.isLetterOrDigit) {
          if (wasWordboundary && sb.nonEmpty) sb.append(c.toUpper)
          else sb.append(c)
        } else {
          if (n == s) {
            sb.append(c)
          }
          s += 1
        }
        i += 1
        wasWordboundary = WordBoundary(c)
      }
      sb.toString()
    }

    variant match {
      case Unchanged        => value
      case Clean            => keepSymbolNum(-1) // remove all symbols
      case KeepSymbolNum(n) => keepSymbolNum(n)
    }
  }
}
