package org.scalablytyped.converter.internal
package ts

import utest.*

object TsTypeFormatterTests extends TestSuite {

  // Helper methods for creating test data
  def createSimpleIdent(name: String): TsIdentSimple = TsIdentSimple(name)

  def createQIdent(parts: String*): TsQIdent = TsQIdent(IArray.fromArray(parts.map(createSimpleIdent).toArray))

  def createTypeRef(name: String, tparams: TsType*): TsTypeRef =
    TsTypeRef(NoComments, createQIdent(name), IArray.fromArray(tparams.toArray))

  def createStringLiteral(value: String): TsTypeLiteral = TsTypeLiteral(TsLiteral.Str(value))

  def createNumLiteral(value: String): TsTypeLiteral = TsTypeLiteral(TsLiteral.Num(value))

  def createBoolLiteral(value: Boolean): TsTypeLiteral = TsTypeLiteral(TsLiteral.Bool(value))

  def createTypeParam(name: String, bound: Option[TsType] = None, default: Option[TsType] = None): TsTypeParam =
    TsTypeParam(NoComments, createSimpleIdent(name), bound, default)

  def createFunParam(name: String, tpe: Option[TsType] = None): TsFunParam =
    TsFunParam(NoComments, createSimpleIdent(name), tpe)

  def createFunSig(
      tparams: IArray[TsTypeParam] = IArray.Empty,
      params: IArray[TsFunParam] = IArray.Empty,
      resultType: Option[TsType] = None
  ): TsFunSig =
    TsFunSig(NoComments, tparams, params, resultType)

  def createMemberProperty(
      name: String,
      tpe: Option[TsType] = None,
      level: TsProtectionLevel = TsProtectionLevel.Default,
      isStatic: Boolean = false,
      isReadOnly: Boolean = false
  ): TsMemberProperty =
    TsMemberProperty(NoComments, level, createSimpleIdent(name), tpe, None, isStatic, isReadOnly)

  def createMemberFunction(
      name: String,
      signature: TsFunSig = createFunSig(),
      level: TsProtectionLevel = TsProtectionLevel.Default,
      methodType: MethodType = MethodType.Normal,
      isStatic: Boolean = false,
      isReadOnly: Boolean = false
  ): TsMemberFunction =
    TsMemberFunction(NoComments, level, createSimpleIdent(name), methodType, signature, isStatic, isReadOnly)

  def createMemberCall(
      signature: TsFunSig = createFunSig(),
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberCall =
    TsMemberCall(NoComments, level, signature)

  def createMemberCtor(
      signature: TsFunSig = createFunSig(),
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberCtor =
    TsMemberCtor(NoComments, level, signature)

  def createMemberIndex(
      indexing: Indexing,
      valueType: Option[TsType] = None,
      isReadOnly: Boolean = false,
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberIndex =
    TsMemberIndex(NoComments, isReadOnly, level, indexing, valueType)

  def createIndexingDict(name: String, tpe: TsType): Indexing.Dict =
    Indexing.Dict(createSimpleIdent(name), tpe)

  def createIndexingSingle(name: String): Indexing.Single =
    Indexing.Single(createQIdent(name))

  def createMemberTypeMapped(
      key: String,
      from: TsType,
      to: TsType,
      readonly: ReadonlyModifier = ReadonlyModifier.Noop,
      optionalize: OptionalModifier = OptionalModifier.Noop,
      as: Option[TsType] = None,
      level: TsProtectionLevel = TsProtectionLevel.Default
  ): TsMemberTypeMapped =
    TsMemberTypeMapped(NoComments, level, readonly, createSimpleIdent(key), from, as, optionalize, to)

  def tests = Tests {
    test("TsTypeFormatter - Basic Functionality") {
      test("qident formats qualified identifiers correctly") {
        val formatter = TsTypeFormatter

        test("single part identifier") {
          val qident = createQIdent("MyClass")
          assert(formatter.qident(qident) == "MyClass")
        }

        test("multi-part identifier") {
          val qident = createQIdent("React", "Component")
          assert(formatter.qident(qident) == "React.Component")
        }

        test("complex nested identifier") {
          val qident = createQIdent("MyNamespace", "SubNamespace", "MyClass")
          assert(formatter.qident(qident) == "MyNamespace.SubNamespace.MyClass")
        }

        test("empty parts") {
          val qident = TsQIdent(IArray.Empty)
          assert(formatter.qident(qident) == "")
        }
      }

      test("lit formats literals correctly") {
        val formatter = TsTypeFormatter

        test("string literal") {
          val lit = TsLiteral.Str("hello")
          assert(formatter.lit(lit) == "'hello'")
        }

        test("string literal with special characters") {
          val lit = TsLiteral.Str("hello world")
          assert(formatter.lit(lit) == "'hello world'")
        }

        test("numeric literal") {
          val lit = TsLiteral.Num("42")
          assert(formatter.lit(lit) == "42")
        }

        test("decimal literal") {
          val lit = TsLiteral.Num("3.14")
          assert(formatter.lit(lit) == "3.14")
        }

        test("boolean literal true") {
          val lit = TsLiteral.Bool(true)
          assert(formatter.lit(lit) == "true")
        }

        test("boolean literal false") {
          val lit = TsLiteral.Bool(false)
          assert(formatter.lit(lit) == "false")
        }
      }

      test("level formats protection levels correctly") {
        val formatter = TsTypeFormatter

        test("default protection level") {
          assert(formatter.level(TsProtectionLevel.Default).isEmpty)
        }

        test("private protection level") {
          assert(formatter.level(TsProtectionLevel.Private).contains("private"))
        }

        test("protected protection level") {
          assert(formatter.level(TsProtectionLevel.Protected).contains("protected"))
        }
      }

      test("tparams formats type parameters correctly") {
        val formatter = TsTypeFormatter

        test("empty type parameters") {
          assert(formatter.tparams(IArray.Empty)(_.toString).isEmpty)
        }

        test("single type parameter") {
          val tparams = IArray(createTypeParam("T"))
          val result = formatter.tparams(tparams)(formatter.tparam)
          assert(result.contains("<T>"))
        }

        test("multiple type parameters") {
          val tparams = IArray(createTypeParam("T"), createTypeParam("U"))
          val result = formatter.tparams(tparams)(formatter.tparam)
          assert(result.contains("<T, U>"))
        }
      }
    }

    test("TsTypeFormatter - Type Parameter Formatting") {
      test("tparam formats type parameters correctly") {
        val formatter = TsTypeFormatter

        test("simple type parameter") {
          val tparam = createTypeParam("T")
          assert(formatter.tparam(tparam) == "T")
        }

        test("type parameter with bound") {
          val bound = createTypeRef("string")
          val tparam = createTypeParam("T", Some(bound))
          assert(formatter.tparam(tparam) == "T extends string")
        }

        test("type parameter with default") {
          val default = createTypeRef("string")
          val tparam = createTypeParam("T", None, Some(default))
          assert(formatter.tparam(tparam) == "T = string")
        }

        test("type parameter with bound and default") {
          val bound = createTypeRef("object")
          val default = createTypeRef("string")
          val tparam = createTypeParam("T", Some(bound), Some(default))
          assert(formatter.tparam(tparam) == "T extends object = string")
        }
      }
    }

    test("TsTypeFormatter - Function Parameter Formatting") {
      test("param formats function parameters correctly") {
        val formatter = TsTypeFormatter

        test("parameter without type") {
          val param = createFunParam("x")
          assert(formatter.param(param) == "x")
        }

        test("parameter with type") {
          val param = createFunParam("x", Some(createTypeRef("number")))
          assert(formatter.param(param) == "x : number")
        }

        test("parameter with complex type") {
          val param = createFunParam("callback", Some(createTypeRef("Function")))
          assert(formatter.param(param) == "callback : Function")
        }
      }
    }

    test("TsTypeFormatter - Function Signature Formatting") {
      test("sig formats function signatures correctly") {
        val formatter = TsTypeFormatter

        test("simple signature with no parameters") {
          val sig = createFunSig()
          assert(formatter.sig(sig) == "()")
        }

        test("signature with single parameter") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params)
          assert(formatter.sig(sig) == "(x : number)")
        }

        test("signature with multiple parameters") {
          val params = IArray(
            createFunParam("x", Some(createTypeRef("number"))),
            createFunParam("y", Some(createTypeRef("string")))
          )
          val sig = createFunSig(params = params)
          assert(formatter.sig(sig) == "(x : number, y : string)")
        }

        test("signature with return type") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params, resultType = Some(createTypeRef("boolean")))
          assert(formatter.sig(sig) == "(x : number): boolean")
        }

        test("signature with type parameters") {
          val tparams = IArray(createTypeParam("T"))
          val params = IArray(createFunParam("x", Some(createTypeRef("T"))))
          val sig = createFunSig(tparams = tparams, params = params, resultType = Some(createTypeRef("T")))
          assert(formatter.sig(sig) == "<T>(x : T): T")
        }

        test("complex signature with multiple type parameters and bounds") {
          val tparams = IArray(
            createTypeParam("T", Some(createTypeRef("object"))),
            createTypeParam("U", Some(createTypeRef("string")), Some(createTypeRef("string")))
          )
          val params = IArray(
            createFunParam("obj", Some(createTypeRef("T"))),
            createFunParam("key", Some(createTypeRef("U")))
          )
          val sig = createFunSig(tparams = tparams, params = params, resultType = Some(createTypeRef("T")))
          assert(formatter.sig(sig) == "<T extends object, U extends string = string>(obj : T, key : U): T")
        }
      }
    }

    test("TsTypeFormatter - Edge Cases for Basic Methods") {
      test("tparams with custom formatter function") {
        val formatter = TsTypeFormatter
        val items = IArray("a", "b", "c")
        val result = formatter.tparams(items)(_.toUpperCase)
        assert(result.contains("<A, B, C>"))
      }

      test("qident with empty parts array") {
        val formatter = TsTypeFormatter
        val emptyQIdent = TsQIdent(IArray.Empty)
        assert(formatter.qident(emptyQIdent) == "")
      }

      test("lit with empty string") {
        val formatter = TsTypeFormatter
        val emptyStr = TsLiteral.Str("")
        assert(formatter.lit(emptyStr) == "''")
      }

      test("lit with special characters in string") {
        val formatter = TsTypeFormatter
        val specialStr = TsLiteral.Str("hello\nworld\t!")
        assert(formatter.lit(specialStr) == "'hello\nworld\t!'")
      }

      test("lit with zero numeric literal") {
        val formatter = TsTypeFormatter
        val zero = TsLiteral.Num("0")
        assert(formatter.lit(zero) == "0")
      }

      test("lit with negative numeric literal") {
        val formatter = TsTypeFormatter
        val negative = TsLiteral.Num("-42.5")
        assert(formatter.lit(negative) == "-42.5")
      }
    }

    test("TsTypeFormatter - Member Formatting") {
      test("member formats TsMemberProperty correctly") {
        val formatter = TsTypeFormatter

        test("simple property without type") {
          val member = createMemberProperty("name")
          assert(formatter.member(member) == "  name")
        }

        test("property with type") {
          val member = createMemberProperty("name", Some(createTypeRef("string")))
          assert(formatter.member(member) == "  name :string")
        }

        test("readonly property") {
          val member = createMemberProperty("name", Some(createTypeRef("string")), isReadOnly = true)
          assert(formatter.member(member) == " readonly name :string")
        }

        test("static property") {
          val member = createMemberProperty("name", Some(createTypeRef("string")), isStatic = true)
          assert(formatter.member(member) == "static  name :string")
        }

        test("private property") {
          val member = createMemberProperty("name", Some(createTypeRef("string")), level = TsProtectionLevel.Private)
          assert(formatter.member(member) == "private   name :string")
        }

        test("protected readonly static property") {
          val member = createMemberProperty(
            "name",
            Some(createTypeRef("string")),
            level = TsProtectionLevel.Protected,
            isStatic = true,
            isReadOnly = true
          )
          assert(formatter.member(member) == "protected static readonly name :string")
        }
      }

      test("member formats TsMemberFunction correctly") {
        val formatter = TsTypeFormatter

        test("simple function without parameters") {
          val member = createMemberFunction("doSomething")
          assert(formatter.member(member) == "doSomething ()")
        }

        test("function with parameters") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params)
          val member = createMemberFunction("calculate", sig)
          assert(formatter.member(member) == "calculate (x : number)")
        }

        test("function with return type") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params, resultType = Some(createTypeRef("string")))
          val member = createMemberFunction("convert", sig)
          assert(formatter.member(member) == "convert (x : number): string")
        }

        test("getter method") {
          val sig = createFunSig(resultType = Some(createTypeRef("string")))
          val member = createMemberFunction("name", sig, methodType = MethodType.Getter)
          assert(formatter.member(member) == "get name (): string")
        }

        test("setter method") {
          val params = IArray(createFunParam("value", Some(createTypeRef("string"))))
          val sig = createFunSig(params = params)
          val member = createMemberFunction("name", sig, methodType = MethodType.Setter)
          assert(formatter.member(member) == "set name (value : string)")
        }

        test("static private function") {
          val member = createMemberFunction(
            "helper",
            level = TsProtectionLevel.Private,
            isStatic = true
          )
          assert(formatter.member(member) == "private static helper ()")
        }
      }

      test("member formats TsMemberCall correctly") {
        val formatter = TsTypeFormatter

        test("simple call signature") {
          val member = createMemberCall()
          assert(formatter.member(member) == "None ()")
        }

        test("call signature with parameters") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params)
          val member = createMemberCall(sig)
          assert(formatter.member(member) == "None (x : number)")
        }

        test("call signature with return type") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params, resultType = Some(createTypeRef("string")))
          val member = createMemberCall(sig)
          assert(formatter.member(member) == "None (x : number): string")
        }
      }

      test("member formats TsMemberCtor correctly") {
        val formatter = TsTypeFormatter

        test("simple constructor") {
          val member = createMemberCtor()
          assert(formatter.member(member) == "new ()")
        }

        test("constructor with parameters") {
          val params = IArray(createFunParam("name", Some(createTypeRef("string"))))
          val sig = createFunSig(params = params)
          val member = createMemberCtor(sig)
          assert(formatter.member(member) == "new (name : string)")
        }

        test("private constructor") {
          val member = createMemberCtor(level = TsProtectionLevel.Private)
          assert(formatter.member(member) == "new ()")
        }
      }

      test("member formats TsMemberIndex correctly") {
        val formatter = TsTypeFormatter

        test("string index signature") {
          val indexing = createIndexingDict("key", createTypeRef("string"))
          val member = createMemberIndex(indexing, Some(createTypeRef("any")))
          assert(formatter.member(member) == "[key: string] : any")
        }

        test("number index signature") {
          val indexing = createIndexingDict("index", createTypeRef("number"))
          val member = createMemberIndex(indexing, Some(createTypeRef("string")))
          assert(formatter.member(member) == "[index: number] : string")
        }

        test("readonly index signature") {
          val indexing = createIndexingDict("key", createTypeRef("string"))
          val member = createMemberIndex(indexing, Some(createTypeRef("any")), isReadOnly = true)
          assert(formatter.member(member) == "readonly [key: string] : any")
        }

        test("index signature without value type") {
          val indexing = createIndexingDict("key", createTypeRef("string"))
          val member = createMemberIndex(indexing)
          assert(formatter.member(member) == "[key: string]")
        }

        test("single indexing") {
          val indexing = createIndexingSingle("K")
          val member = createMemberIndex(indexing, Some(createTypeRef("T")))
          assert(formatter.member(member) == "[K] : T")
        }
      }
    }

    test("TsTypeFormatter - Type Formatting - Basic Types") {
      test("apply formats basic types correctly") {
        val formatter = TsTypeFormatter

        test("TsTypeRef without type parameters") {
          val tpe = createTypeRef("string")
          assert(formatter.apply(tpe) == "string")
        }

        test("TsTypeRef with single type parameter") {
          val tpe = createTypeRef("Array", createTypeRef("string"))
          assert(formatter.apply(tpe) == "Array<string>")
        }

        test("TsTypeRef with multiple type parameters") {
          val tpe = createTypeRef("Map", createTypeRef("string"), createTypeRef("number"))
          assert(formatter.apply(tpe) == "Map<string, number>")
        }

        test("TsTypeLiteral string") {
          val tpe = createStringLiteral("hello")
          assert(formatter.apply(tpe) == "'hello'")
        }

        test("TsTypeLiteral number") {
          val tpe = createNumLiteral("42")
          assert(formatter.apply(tpe) == "42")
        }

        test("TsTypeLiteral boolean") {
          val tpe = createBoolLiteral(true)
          assert(formatter.apply(tpe) == "true")
        }

        test("TsTypeObject empty") {
          val tpe = TsTypeObject(NoComments, IArray.Empty)
          assert(formatter.apply(tpe) == "{}")
        }

        test("TsTypeObject with single member") {
          val member = createMemberProperty("name", Some(createTypeRef("string")))
          val tpe = TsTypeObject(NoComments, IArray(member))
          assert(formatter.apply(tpe) == "{  name :string}")
        }

        test("TsTypeObject with multiple members") {
          val member1 = createMemberProperty("name", Some(createTypeRef("string")))
          val member2 = createMemberProperty("age", Some(createTypeRef("number")))
          val tpe = TsTypeObject(NoComments, IArray(member1, member2))
          assert(formatter.apply(tpe) == "{  name :string,   age :number}")
        }

        test("TsTypeFunction simple") {
          val sig = createFunSig()
          val tpe = TsTypeFunction(sig)
          assert(formatter.apply(tpe) == "()")
        }

        test("TsTypeFunction with parameters and return type") {
          val params = IArray(createFunParam("x", Some(createTypeRef("number"))))
          val sig = createFunSig(params = params, resultType = Some(createTypeRef("string")))
          val tpe = TsTypeFunction(sig)
          assert(formatter.apply(tpe) == "(x : number): string")
        }
      }
    }

    test("TsTypeFormatter - Type Formatting - Advanced Types") {
      test("apply formats advanced types correctly") {
        val formatter = TsTypeFormatter

        test("TsTypeUnion with two types") {
          val tpe = TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number")))
          assert(formatter.apply(tpe) == "string | number")
        }

        test("TsTypeUnion with multiple types") {
          val tpe = TsTypeUnion(IArray(
            createTypeRef("string"),
            createTypeRef("number"),
            createTypeRef("boolean")
          ))
          assert(formatter.apply(tpe) == "string | number | boolean")
        }

        test("TsTypeIntersect with two types") {
          val tpe = TsTypeIntersect(IArray(createTypeRef("A"), createTypeRef("B")))
          assert(formatter.apply(tpe) == "A & B")
        }

        test("TsTypeIntersect with multiple types") {
          val tpe = TsTypeIntersect(IArray(
            createTypeRef("A"),
            createTypeRef("B"),
            createTypeRef("C")
          ))
          assert(formatter.apply(tpe) == "A & B & C")
        }

        test("TsTypeTuple empty") {
          val tpe = TsTypeTuple(IArray.Empty)
          assert(formatter.apply(tpe) == "[]")
        }

        test("TsTypeTuple with single element") {
          val tpe = TsTypeTuple(IArray(TsTupleElement.unlabeled(createTypeRef("string"))))
          assert(formatter.apply(tpe) == "[string]")
        }

        test("TsTypeTuple with multiple elements") {
          val tpe = TsTypeTuple(IArray(
            TsTupleElement.unlabeled(createTypeRef("string")),
            TsTupleElement.unlabeled(createTypeRef("number")),
            TsTupleElement.unlabeled(createTypeRef("boolean"))
          ))
          assert(formatter.apply(tpe) == "[string, number, boolean]")
        }

        test("Array type using TsTypeRef") {
          val tpe = createTypeRef("Array", createTypeRef("string"))
          assert(formatter.apply(tpe) == "Array<string>")
        }

        test("Complex array type") {
          val innerType = createTypeRef("Map", createTypeRef("string"), createTypeRef("number"))
          val tpe = createTypeRef("Array", innerType)
          assert(formatter.apply(tpe) == "Array<Map<string, number>>")
        }

        test("TsTypeKeyOf") {
          val tpe = TsTypeKeyOf(createTypeRef("T"))
          assert(formatter.apply(tpe) == "keyof T")
        }

        test("TsTypeLookup") {
          val tpe = TsTypeLookup(createTypeRef("T"), createTypeRef("K"))
          assert(formatter.apply(tpe) == "T[K]")
        }

        test("TsTypeThis") {
          val tpe = TsTypeThis()
          assert(formatter.apply(tpe) == "this")
        }

        test("TsTypeRepeated") {
          val tpe = TsTypeRepeated(createTypeRef("string"))
          assert(formatter.apply(tpe) == "...string")
        }
      }
    }

    test("TsTypeFormatter - Edge Cases and Error Handling") {
      test("handles complex nested types") {
        val formatter = TsTypeFormatter

        test("nested union in intersection") {
          val union = TsTypeUnion(IArray(createTypeRef("A"), createTypeRef("B")))
          val tpe = TsTypeIntersect(IArray(union, createTypeRef("C")))
          assert(formatter.apply(tpe) == "A | B & C")
        }

        test("nested intersection in union") {
          val intersect = TsTypeIntersect(IArray(createTypeRef("A"), createTypeRef("B")))
          val tpe = TsTypeUnion(IArray(intersect, createTypeRef("C")))
          assert(formatter.apply(tpe) == "A & B | C")
        }

        test("deeply nested type parameters") {
          val innerType = createTypeRef("Promise", createTypeRef("Array", createTypeRef("string")))
          val tpe = createTypeRef("Observable", innerType)
          assert(formatter.apply(tpe) == "Observable<Promise<Array<string>>>")
        }

        test("complex tuple with mixed types") {
          val tpe = TsTypeTuple(IArray(
            TsTupleElement.unlabeled(createStringLiteral("hello")),
            TsTupleElement.unlabeled(createNumLiteral("42")),
            TsTupleElement.unlabeled(TsTypeRepeated(createTypeRef("string")))
          ))
          assert(formatter.apply(tpe) == "['hello', 42, ...string]")
        }

        test("object type with complex members") {
          val indexMember = createMemberIndex(
            createIndexingDict("key", createTypeRef("string")),
            Some(TsTypeUnion(IArray(createTypeRef("string"), createTypeRef("number"))))
          )
          val funcMember = createMemberFunction(
            "method",
            createFunSig(
              params = IArray(createFunParam("arg", Some(createTypeRef("T")))),
              resultType = Some(createTypeRef("Promise", createTypeRef("T")))
            )
          )
          val tpe = TsTypeObject(NoComments, IArray(indexMember, funcMember))
          assert(formatter.apply(tpe) == "{[key: string] : string | number, method (arg : T): Promise<T>}")
        }
      }

      test("handles edge cases gracefully") {
        val formatter = TsTypeFormatter

        test("empty union type") {
          val tpe = TsTypeUnion(IArray.Empty)
          assert(formatter.apply(tpe) == "")
        }

        test("single element union type") {
          val tpe = TsTypeUnion(IArray(createTypeRef("string")))
          assert(formatter.apply(tpe) == "string")
        }

        test("empty intersection type") {
          val tpe = TsTypeIntersect(IArray.Empty)
          assert(formatter.apply(tpe) == "")
        }

        test("single element intersection type") {
          val tpe = TsTypeIntersect(IArray(createTypeRef("string")))
          assert(formatter.apply(tpe) == "string")
        }

        test("function with no parameters and no return type") {
          val sig = createFunSig()
          val tpe = TsTypeFunction(sig)
          assert(formatter.apply(tpe) == "()")
        }

        test("function with rest parameter") {
          val restParam = createFunParam("args", Some(TsTypeRepeated(createTypeRef("string"))))
          val sig = createFunSig(params = IArray(restParam))
          val tpe = TsTypeFunction(sig)
          assert(formatter.apply(tpe) == "(args : ...string)")
        }

        test("keyof with complex type") {
          val objectType = TsTypeObject(NoComments, IArray(
            createMemberProperty("prop1", Some(createTypeRef("string"))),
            createMemberProperty("prop2", Some(createTypeRef("number")))
          ))
          val tpe = TsTypeKeyOf(objectType)
          assert(formatter.apply(tpe) == "keyof {  prop1 :string,   prop2 :number}")
        }

        test("lookup with union key") {
          val keyType = TsTypeUnion(IArray(createStringLiteral("a"), createStringLiteral("b")))
          val tpe = TsTypeLookup(createTypeRef("T"), keyType)
          assert(formatter.apply(tpe) == "T['a' | 'b']")
        }
      }

      test("handles special characters and escaping") {
        val formatter = TsTypeFormatter

        test("string literal with quotes") {
          val tpe = createStringLiteral("hello \"world\"")
          assert(formatter.apply(tpe) == "'hello \"world\"'")
        }

        test("string literal with single quotes") {
          val tpe = createStringLiteral("hello 'world'")
          assert(formatter.apply(tpe) == "'hello 'world''")
        }

        test("identifier with special characters") {
          val tpe = createTypeRef("$special_name123")
          assert(formatter.apply(tpe) == "$special_name123")
        }

        test("property name with special characters") {
          val member = createMemberProperty("$prop-name", Some(createTypeRef("string")))
          assert(formatter.member(member) == "  $prop-name :string")
        }
      }
    }
  }
}