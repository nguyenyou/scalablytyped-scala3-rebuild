package typings.tabulatorTables.mod

import typings.std.Record
import org.scalablytyped.runtime.StObject
import scala.scalajs.js
import scala.scalajs.js.annotation.{JSGlobalScope, JSGlobal, JSImport, JSName, JSBracketAccess}

trait DownloadXLXS extends StObject {
  
  var compress: js.UndefOr[Boolean] = js.undefined
  
  var documentProcessing: js.UndefOr[js.Function1[/* input */ Any, Any]] = js.undefined
  
  /** The sheet name must be a valid Excel sheet name, and cannot include any of the following characters \, /, *, [, ], :, */
  var sheetName: js.UndefOr[String] = js.undefined
  
  var test: js.UndefOr[js.Object] = js.undefined
  
  var writeOptions: js.UndefOr[Record[String, Any]] = js.undefined
}
object DownloadXLXS {
  
  inline def apply(): DownloadXLXS = {
    val __obj = js.Dynamic.literal()
    __obj.asInstanceOf[DownloadXLXS]
  }
  
  @scala.inline
  implicit open class MutableBuilder[Self <: DownloadXLXS] (val x: Self) extends AnyVal {
    
    inline def setCompress(value: Boolean): Self = StObject.set(x, "compress", value.asInstanceOf[js.Any])
    
    inline def setCompressUndefined: Self = StObject.set(x, "compress", js.undefined)
    
    inline def setDocumentProcessing(value: /* input */ Any => Any): Self = StObject.set(x, "documentProcessing", js.Any.fromFunction1(value))
    
    inline def setDocumentProcessingUndefined: Self = StObject.set(x, "documentProcessing", js.undefined)
    
    inline def setSheetName(value: String): Self = StObject.set(x, "sheetName", value.asInstanceOf[js.Any])
    
    inline def setSheetNameUndefined: Self = StObject.set(x, "sheetName", js.undefined)
    
    inline def setTest(value: js.Object): Self = StObject.set(x, "test", value.asInstanceOf[js.Any])
    
    inline def setTestUndefined: Self = StObject.set(x, "test", js.undefined)
    
    inline def setWriteOptions(value: Record[String, Any]): Self = StObject.set(x, "writeOptions", value.asInstanceOf[js.Any])
    
    inline def setWriteOptionsUndefined: Self = StObject.set(x, "writeOptions", js.undefined)
  }
}
