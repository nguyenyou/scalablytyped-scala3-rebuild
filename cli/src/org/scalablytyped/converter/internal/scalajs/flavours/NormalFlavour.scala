package org.scalablytyped.converter.internal
package scalajs
package flavours
import org.scalablytyped.converter.internal.scalajs.transforms.CleanIllegalNames

case class NormalFlavour(
    shouldUseScalaJsDomTypes: Boolean,
    enableLongApplyMethod: Boolean,
    outputPkg: Name,
    versions: Versions
) extends FlavourImpl {
  lazy val stdNames                = new QualifiedName.StdNames(outputPkg)
  private lazy val scalaJsLibNames = new ScalaJsLibNames(stdNames)
  private lazy val scalaJsDomNames = new ScalaJsDomNames(stdNames)

  override val dependencies: Set[Dep] =
    if (shouldUseScalaJsDomTypes) Set(versions.scalaJsDom, versions.runtime) else Set(versions.runtime)

  override val rewrites: IArray[CastConversion] =
    scalaJsLibNames.All ++ (if (shouldUseScalaJsDomTypes) scalaJsDomNames.All else Empty)

  lazy val parentsResolver              = new ParentsResolver
  val memberToProp                      = new MemberToProp.Default(rewrites)
  val findProps                         = new FindProps(new CleanIllegalNames(outputPkg), memberToProp, parentsResolver)
  val genCompanions: TreeTransformation = new GenCompanions(findProps, enableLongApplyMethod) >> GenPromiseOps

  final override def rewrittenTree(scope: TreeScope, tree: PackageTree): PackageTree =
    genCompanions.visitPackageTree(scope)(tree)
}
