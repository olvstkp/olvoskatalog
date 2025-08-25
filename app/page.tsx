"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Search, Download, Mail, Phone, Globe, Plus, Minus, Grid3X3, List, DollarSign } from "lucide-react"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { ProductWithImages } from "@/lib/database.types"

// Currency formatters
const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

// EUR/USD exchange rate (you might want to fetch this from an API)
const USD_TO_EUR_RATE = 0.85

// PDF Export Function
const exportToPDF = async (products: ProductWithImages[], showCurrency: "usd" | "eur" | "both") => {
  try {
    console.log('PDF oluşturuluyor...', { productCount: products.length, currency: showCurrency })
    
    const doc = new jsPDF()
    
    // Professional Header
    const pageWidth = doc.internal.pageSize.width
    
    // Main Title - Centered
    doc.setFontSize(24)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.setFont('helvetica', 'bold')
    const titleText = 'OLIVOS PRODUCT CATALOG 2025'
    const titleWidth = doc.getTextWidth(titleText)
    doc.text(titleText, (pageWidth - titleWidth) / 2, 25)
    
    // Subtitle - Centered
    doc.setFontSize(12)
    doc.setTextColor(71, 85, 105) // slate-600
    doc.setFont('helvetica', 'normal')
    const subtitleText = 'Professional Soap & Skincare Products'
    const subtitleWidth = doc.getTextWidth(subtitleText)
    doc.text(subtitleText, (pageWidth - subtitleWidth) / 2, 35)
    
    // Divider line
    doc.setDrawColor(203, 213, 225) // slate-300
    doc.setLineWidth(0.5)
    doc.line(20, 42, pageWidth - 20, 42)
    
    // Info section
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    doc.text(`Generated: ${today}`, 20, 52)
    doc.text(`Total Products: ${products.length}`, 20, 60)
    
    // Currency info - right aligned
    let currencyText = ""
    if (showCurrency === "usd") currencyText = "All prices in USD"
    else if (showCurrency === "eur") currencyText = "All prices in EUR"
    else currencyText = "Prices shown in USD and EUR"
    
    const currencyWidth = doc.getTextWidth(currencyText)
    doc.text(currencyText, pageWidth - 20 - currencyWidth, 52)
    
    // Right side bilgiler kaldırıldı
  
    // Helper function to load main product image as base64
    const getImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
      try {
        if (!imageUrl || typeof imageUrl !== 'string') {
          console.warn('Geçersiz görsel URL')
          return null
        }

        console.log('🔄 Ana görsel yükleniyor:', imageUrl)
        
        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/webp,image/avif,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          // timeout için AbortController kullanabiliriz
          signal: AbortSignal.timeout(10000) // 10 saniye timeout
        })
        
        if (!response.ok) {
          console.warn(`❌ HTTP ${response.status}: ${response.statusText}`)
          return null
        }
        
        const blob = await response.blob()
        
        // Dosya boyutu kontrolü (max 5MB)
        if (blob.size > 5 * 1024 * 1024) {
          console.warn('⚠️ Görsel çok büyük (>5MB):', blob.size)
          return null
        }
        
        // Sadece image formatlarını kabul et
        if (!blob.type.startsWith('image/')) {
          console.warn('❌ Geçersiz dosya formatı:', blob.type)
          return null
        }
        
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            if (result && result.startsWith('data:image/')) {
              console.log(`✅ Base64 dönüştürüldü: ${blob.type}, ${(blob.size/1024).toFixed(1)}KB`)
              resolve(result)
            } else {
              console.warn('❌ Base64 dönüşümü geçersiz')
              resolve(null)
            }
          }
          reader.onerror = () => {
            console.error('❌ FileReader hatası')
            resolve(null)
          }
          reader.readAsDataURL(blob)
        })
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'TimeoutError') {
            console.warn('⏱️ Görsel yükleme timeout (10s)')
          } else {
            console.error('❌ Görsel yükleme hatası:', error.message)
          }
        } else {
          console.error('❌ Bilinmeyen görsel yükleme hatası:', error)
        }
        return null
      }
    }
  
    // Prepare table data with main images only
    console.log('Tablo verileri hazırlanıyor...')
    
    const tableData: (string | null | number)[][] = []
    for (let index = 0; index < products.length; index++) {
      const product = products[index]
      const usdPrice = product.price_per_piece_usd || product.price_per_piece || 0
      const eurPrice = usdPrice * USD_TO_EUR_RATE
      
      let priceText = ""
      if (showCurrency === "usd") priceText = `$${usdPrice.toFixed(2)}`
      else if (showCurrency === "eur") priceText = `€${eurPrice.toFixed(2)}`
      else priceText = `$${usdPrice.toFixed(2)} / €${eurPrice.toFixed(2)}`
      
      // Ana görsel varsa yükle, yoksa null bırak
      let productImage = null
      if (product.product_images && product.product_images.length > 0) {
        const mainImageUrl = product.product_images[0].image_url
        console.log(`Ürün ${index + 1} (${product.name}) ana görseli yükleniyor...`)
        try {
          productImage = await getImageAsBase64(mainImageUrl)
          if (productImage) {
            console.log(`✅ Ürün ${index + 1} görseli başarıyla yüklendi`)
          } else {
            console.log(`⚠️ Ürün ${index + 1} görseli yüklenemedi, boş bırakılıyor`)
          }
        } catch (error) {
          console.log(`❌ Ürün ${index + 1} görsel yükleme hatası:`, error)
          productImage = null
        }
      } else {
        console.log(`📷 Ürün ${index + 1} (${product.name}) için görsel yok`)
      }
      
      tableData.push([
        productImage, // Ana görsel veya null
        product.name,
        product.barcode || 'N/A',
        product.series?.pieces_per_case || 1,
        `${product.series?.net_weight_kg_per_piece || 'N/A'}kg`,
        priceText
      ])
    }
    
    console.log(`📊 Tablo verileri hazır: ${tableData.length} ürün`)
    const withImages = tableData.filter(row => row[0] !== null).length
    console.log(`🖼️ Görselli ürün sayısı: ${withImages}/${tableData.length}`)
  
    // Table
    const tableColumns = [
      '#',
      'Image',
      'Product Name',
      'Barcode',
      'Units/Case',
      'Weight',
      'Price'
    ]
    
    // Table with images in first column
    const simpleTableColumns = [
      'Image',
      'Product Name',
      'Barcode',
      'Units/Case',
      'Weight',
      'Price'
    ]
    
    const simpleTableData = tableData.map(row => [
      '', // Empty string for image column - will be filled by didDrawCell
      row[1], // Product Name
      row[2], // Barcode
      row[3], // Units/Case
      row[4], // Weight
      row[5]  // Price
    ])
    
    console.log('Tablo oluşturuluyor...')
    
    // Tablo genişliğini hesapla ve sayfa ortasına yerleştir
    const tableWidth = 36 + 60 + 28 + 24 + 24 + 32 // Toplam kolon genişlikleri (resim kolonu büyütüldü)
    const currentPageWidth = doc.internal.pageSize.width
    const startX = (currentPageWidth - tableWidth) / 2 // Tabloyu ortala
    
    autoTable(doc, {
      head: [simpleTableColumns],
      body: simpleTableData,
      startY: 75,
      margin: { 
        left: startX, 
        right: startX,
        bottom: 40 // Footer için daha fazla alt boşluk
      },
      pageBreak: 'auto',
      showHead: 'everyPage', // Her sayfada header göster
      tableWidth: 'auto',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        minCellHeight: 34, // Daha büyük resimler için daha yüksek satır
        valign: 'middle',
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
        halign: 'center'
      },
      headStyles: {
        fillColor: [75, 85, 99], // Daha koyu gri (slate-600)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: 6,
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Daha açık gri (gray-50)
      },
      columnStyles: {
        0: { cellWidth: 36, halign: 'center' }, // Image - daha da geniş (32→36)
        1: { cellWidth: 60, valign: 'middle', halign: 'left' }, // Product Name - biraz daraltıldı (62→60)
        2: { cellWidth: 28, halign: 'center' }, // Barcode
        3: { halign: 'center', cellWidth: 24, valign: 'middle' }, // Units/Case
        4: { halign: 'center', cellWidth: 24, valign: 'middle' }, // Weight
        5: { halign: 'center', cellWidth: 32, valign: 'middle' } // Price - her zaman ortala
      },
      didDrawCell: (data: any) => {
        // Add product images in first column (only main images)
        if (data.section === 'body' && data.column.index === 0) {
          const rowIndex = data.row.index
          
          // Güvenlik kontrolleri
          if (rowIndex >= 0 && rowIndex < tableData.length) {
            const imageData = tableData[rowIndex][0] // Ana görsel
            
            // Sadece geçerli base64 image data'sı varsa ekle
            if (imageData && 
                typeof imageData === 'string' && 
                imageData.startsWith('data:image/') &&
                imageData.length > 50) { // Minimum boyut kontrolü
              
              try {
                // Format detection
                let format = 'JPEG'
                if (imageData.includes('data:image/png')) format = 'PNG'
                else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) format = 'JPEG'
                else if (imageData.includes('data:image/webp')) format = 'WEBP'
                
                // Daha büyük resim boyutu ve ortalama
                const cellWidth = data.cell.width
                const cellHeight = data.cell.height
                const maxImageSize = 30 // Resim boyutunu büyüttük: 24px → 30px
                const imageSize = Math.min(cellWidth - 4, cellHeight - 4, maxImageSize)
                
                // Resmi hücrede ortala
                const centerX = data.cell.x + (cellWidth - imageSize) / 2
                const centerY = data.cell.y + (cellHeight - imageSize) / 2
                
                doc.addImage(
                  imageData,
                  format,
                  centerX,
                  centerY,
                  imageSize,
                  imageSize
                )
                
                console.log(`✅ PDF'e görsel eklendi: Ürün ${rowIndex + 1}, Format: ${format}`)
              } catch (addImageError) {
                const errorMsg = addImageError instanceof Error ? addImageError.message : 'Bilinmeyen hata'
                console.warn(`⚠️ PDF'e görsel eklenemedi (Ürün ${rowIndex + 1}):`, errorMsg)
                // Hata olsa da devam et, görsel olmadan tablo oluştur
              }
            } else {
              // Görsel yok, boş hücre bırak
              console.log(`📷 Ürün ${rowIndex + 1}: Görsel yok, boş bırakılıyor`)
            }
          }
        }
      }
    })
  
    // Professional Footer - Güvenli pozisyonlama
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      const pageHeight = doc.internal.pageSize.height
      const footerPageWidth = doc.internal.pageSize.width
      const footerY = pageHeight - 25 // Footer için daha fazla boşluk
      const footerLineY = pageHeight - 32 // Çizgi için daha yüksek pozisyon
      
      // Footer line - daha yukarıda
      doc.setDrawColor(203, 213, 225) // slate-300
      doc.setLineWidth(0.3)
      doc.line(20, footerLineY, footerPageWidth - 20, footerLineY)
      
      // Footer text - güvenli alanda
      doc.setFontSize(8) // Biraz daha küçük font
      doc.setTextColor(100, 116, 139) // slate-500
      doc.setFont('helvetica', 'normal')
      
      // Left side - Company info (sadece şirket adı)
      doc.text('OLIVOS Soap & Cosmetics', 20, footerY)
      
      // Right side - Page number
      const pageText = `Page ${i} of ${pageCount}`
      const pageTextWidth = doc.getTextWidth(pageText)
      doc.text(pageText, footerPageWidth - 20 - pageTextWidth, footerY)
      
      // Center - Website (alt satırda)
              const websiteText = 'www.olivos.com.tr'
      const websiteWidth = doc.getTextWidth(websiteText)
      doc.text(websiteText, (footerPageWidth - websiteWidth) / 2, footerY + 8)
    }
  
    // Save
    console.log('PDF kaydediliyor...')
    doc.save(`olivos-catalog-${new Date().toISOString().split('T')[0]}.pdf`)
    console.log('PDF başarıyla kaydedildi!')
    
  } catch (error) {
    console.error('PDF export sırasında hata:', error)
    throw error
  }
}

function ProductRow({
  product,
  onAddToInquiry,
  showCurrency,
}: { 
  product: ProductWithImages; 
  onAddToInquiry: (product: ProductWithImages, quantity: number) => void;
  showCurrency: "usd" | "eur" | "both";
}) {
  const [inquiryQuantity, setInquiryQuantity] = useState(product.series?.pieces_per_case || 1)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sage-100 mb-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative z-10 hover:z-20">
      <div className="flex">
        {/* Product Image - Büyük ve baskın */}
        <div 
          className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-sage-50 to-sage-100 p-6 relative group cursor-pointer"
          onClick={() => {
            setCurrentImageIndex(0)
            setShowImagePreview(true)
          }}
        >
          <div className="w-full h-full relative transition-transform duration-700 ease-out group-hover:scale-[2.5] group-hover:z-50">
            <Image 
              src={product.product_images?.[0]?.image_url || "/placeholder.svg"} 
              alt={product.name} 
              fill 
              className="object-contain drop-shadow-lg transition-all duration-500 group-hover:drop-shadow-2xl"
              quality={100}
              unoptimized={false}
              priority={false}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ 
                imageRendering: 'auto',
                msInterpolationMode: 'bicubic'
              } as React.CSSProperties}
            />
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none"></div>
          
          {/* Preview label */}
          <div className="absolute bottom-2 left-2 right-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-sage-700 bg-white/90 px-2 py-1 rounded-full backdrop-blur-sm">
              Click to preview
            </span>
          </div>
        </div>

        {/* Product Info - Arka planda daha minimal */}
        <div className="flex-1 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-sage-900 mb-2">{product.name}</h3>
            <p className="text-sage-600 text-sm mb-1">{product.catalog_description || ''}</p>
            <p className="text-sage-500 text-xs">{product.series?.name || ''}</p>
          </div>

          {/* Info Grid - Daha kompakt */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-sage-50 rounded-lg p-3 text-center border border-sage-100">
              <div className="text-xs text-sage-600 mb-1">BARCODE</div>
              <div className="text-sm font-mono text-sage-800">{product.barcode || 'N/A'}</div>
          </div>

            <div className="bg-sage-50 rounded-lg p-3 text-center border border-sage-100">
              <div className="text-xs text-sage-600 mb-1">UNIT/CASE</div>
              <div className="text-lg font-bold text-sage-800">{product.series?.pieces_per_case || 1}</div>
          </div>

            <div className="bg-sage-50 rounded-lg p-3 text-center border border-sage-100">
              <div className="text-xs text-sage-600 mb-1">WEIGHT</div>
              <div className="text-sm font-semibold text-sage-800">{product.series?.net_weight_kg_per_piece || 'N/A'} kg</div>
          </div>

            <div className="bg-gradient-to-r from-sage-100 to-sage-200 rounded-lg p-3 text-center border border-sage-200">
              <div className="text-xs text-sage-700 mb-1">PRICE</div>
              {showCurrency === "both" ? (
                <div className="space-y-1">
                  <div className="text-lg font-bold text-sage-900">
                    {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
          </div>
                  <div className="text-sm font-semibold text-sage-700">
                    {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                  </div>
                </div>
              ) : showCurrency === "eur" ? (
                <div className="text-xl font-bold text-sage-900">
                  {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                </div>
              ) : (
                <div className="text-xl font-bold text-sage-900">
                  {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                </div>
              )}
        </div>
      </div>

          {/* Inquiry Section - Alt kısımda */}
          <div className="flex items-center justify-between pt-4 border-t border-sage-100">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-sage-600 border-sage-300">
                {product.series?.name || 'Product'}
            </Badge>
          </div>
            
          <div className="flex items-center gap-3">
              <span className="text-xs text-sage-600 font-medium">Quantity:</span>
              <div className="flex items-center border border-sage-300 rounded-lg bg-white overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                  onClick={() => setInquiryQuantity(Math.max(product.series?.pieces_per_case || 1, inquiryQuantity - (product.series?.pieces_per_case || 1)))}
                  className="px-3 h-8 text-sage-600 hover:bg-sage-50"
              >
                <Minus className="h-3 w-3" />
              </Button>
                <span className="px-4 py-1 text-sm font-semibold min-w-[3rem] text-center border-x border-sage-200 bg-sage-50">{inquiryQuantity}</span>
              <Button
                variant="ghost"
                size="sm"
                  onClick={() => setInquiryQuantity(inquiryQuantity + (product.series?.pieces_per_case || 1))}
                  className="px-3 h-8 text-sage-600 hover:bg-sage-50"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              onClick={() => onAddToInquiry(product, inquiryQuantity)}
              className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 active:bg-gradient-to-r active:from-emerald-600 active:to-emerald-700"
            >
              Add to Inquiry
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Advanced Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-sage-200/50 shadow-2xl">
          <DialogTitle className="sr-only">{product.name} - Product Preview</DialogTitle>
          
          {/* Header with product info */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/90 via-white/80 to-transparent backdrop-blur-sm p-6 border-b border-sage-200/30">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-sage-900">{product.name}</h1>
                <p className="text-sage-600 text-lg mb-2">{product.catalog_description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-sage-100/80 backdrop-blur-sm text-sage-700 px-3 py-1 rounded-full border border-sage-200">
                    {product.series?.name || 'Product Series'}
                  </span>
                                      {showCurrency === "both" ? (
                      <div className="flex gap-2">
                        <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                          {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                        </span>
                        <span className="bg-sage-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                          {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                        </span>
                      </div>
                    ) : showCurrency === "eur" ? (
                      <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                        {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                      </span>
                    ) : (
                      <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                        {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                      </span>
                    )}
                </div>
              </div>
              <button
                onClick={() => setShowImagePreview(false)}
                className="text-sage-400 hover:text-sage-600 text-2xl font-light transition-colors bg-white/50 hover:bg-white/80 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main image area */}
          <div className="relative w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-sage-50/30 to-sage-100/20">
            <div className="relative max-w-[85vw] max-h-[85vh] w-full h-full bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-sage-200/30">
              <Image 
                src={product.product_images?.[currentImageIndex]?.image_url || product.product_images?.[0]?.image_url || "/placeholder.svg"} 
                alt={product.name} 
                fill 
                className="object-contain drop-shadow-2xl cursor-zoom-in hover:scale-105 transition-transform duration-500"
                quality={100}
                unoptimized={false}
                priority={true}
                sizes="95vw"
                style={{ 
                  imageRendering: 'auto',
                  msInterpolationMode: 'bicubic'
                } as React.CSSProperties}
              />
            </div>

            {/* Image navigation arrows */}
            {product.product_images && product.product_images.length > 1 && (
              <>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : product.product_images.length - 1)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-sage-600 p-3 rounded-full transition-all duration-200 border border-sage-200 shadow-lg hover:shadow-xl"
                  >
                    ←
                  </button>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev < product.product_images.length - 1 ? prev + 1 : 0)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-sage-600 p-3 rounded-full transition-all duration-200 border border-sage-200 shadow-lg hover:shadow-xl"
                  >
                    →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bottom info panel */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white/90 via-white/80 to-transparent backdrop-blur-sm p-6 border-t border-sage-200/30">
            <div className="grid grid-cols-5 gap-6 text-center">
              <div>
                <p className="text-sage-600 text-sm mb-1">Barcode</p>
                <p className="font-mono text-lg text-sage-800">{product.barcode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Units per Case</p>
                <p className="text-2xl font-bold text-sage-900">{product.series?.pieces_per_case || 1}</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Weight per Unit</p>
                <p className="text-xl font-semibold text-sage-800">{product.series?.net_weight_kg_per_piece || 'N/A'} kg</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Net Weight per Case</p>
                <p className="text-xl font-semibold text-sage-800">{product.series?.net_weight_kg_per_case || 'N/A'} kg</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Unit Price</p>
                {showCurrency === "both" ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                    </p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                    </p>
                  </div>
                ) : showCurrency === "eur" ? (
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                onClick={() => {
                  onAddToInquiry(product, product.series?.pieces_per_case || 1)
                  setShowImagePreview(false)
                }}
                className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white px-8 py-3 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 active:bg-gradient-to-r active:from-emerald-600 active:to-emerald-700"
              >
                Add to Inquiry
              </Button>
              <Button
                variant="outline"
                className="border-2 border-sage-300 text-sage-700 hover:bg-sage-100 px-8 py-3 text-lg backdrop-blur-sm bg-white/50"
              >
                Download Image
              </Button>
              <Button
                variant="outline"
                className="border-2 border-sage-300 text-sage-700 hover:bg-sage-100 px-8 py-3 text-lg backdrop-blur-sm bg-white/50"
              >
                Share Product
              </Button>
            </div>
          </div>

          {/* Image thumbnails */}
          {product.product_images && product.product_images.length > 1 && (
            <div className="absolute left-8 bottom-24 z-10">
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {product.product_images.map((image, index) => (
                  <div 
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg cursor-pointer transition-all duration-200 ${
                      index === currentImageIndex 
                        ? 'bg-white/90 border-2 border-sage-500 scale-110' 
                        : 'bg-white/70 border border-sage-300 hover:bg-white/80'
                    }`}
                  >
                    <Image 
                      src={image.image_url} 
                      alt={`Thumbnail ${index + 1}`} 
                      width={64} 
                      height={64} 
                      className="object-contain w-full h-full"
                      quality={100}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image info indicator */}
          <div className="absolute top-20 right-8 z-10 text-sage-500 text-sm bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-sage-200">
            {product.product_images && product.product_images.length > 1 
              ? `${currentImageIndex + 1}/${product.product_images.length} • ESC to close`
              : 'Click image to zoom • ESC to close'
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InquiryDialog({ inquiryItems, onRemoveItem, onUpdateQuantity, onClearInquiry }: any) {
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [message, setMessage] = useState("")

  const totalItems = inquiryItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
  const estimatedValue = inquiryItems.reduce(
    (sum: number, item: any) => sum + (item.product.price_per_piece_usd || item.product.price_per_piece || 0) * item.quantity,
    0,
  )

  const handleSubmitInquiry = () => {
    console.log("Submitting inquiry:", {
      company: companyName,
      contact: contactName,
      email,
      phone,
      country,
      message,
      items: inquiryItems,
      totalItems,
      estimatedValue,
    })
    alert("Your inquiry has been submitted successfully! We will contact you within 24 hours.")
    onClearInquiry()
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-sage-800">Product Inquiry Request</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inquiry Items */}
        <div>
          <h3 className="font-semibold mb-4 text-sage-800">Selected Products ({inquiryItems.length})</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {inquiryItems.map((item: any) => (
              <Card key={item.product.id} className="p-3 border-sage-200">
                <div className="flex items-center gap-3">
                  <Image
                    src={item.product.product_images?.[0]?.image_url || "/placeholder.svg"}
                    alt={item.product.name}
                    width={40}
                    height={40}
                    className="rounded object-contain"
                    quality={100}
                    unoptimized={false}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-sage-900">{item.product.name}</h4>
                    <p className="text-xs text-sage-600">{item.product.catalog_description || ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center border rounded border-sage-300">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              Math.max(item.product.series?.pieces_per_case || 1, item.quantity - (item.product.series?.pieces_per_case || 1)),
                            )
                          }
                          className="px-2 h-6"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="px-2 text-xs">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + (item.product.series?.pieces_per_case || 1))}
                          className="px-2 h-6"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 px-2 h-6 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm text-sage-900">${(item.product.price_per_piece_usd || item.product.price_per_piece || 0).toFixed(2)}</p>
                    <p className="text-xs text-sage-600">per unit</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 p-3 bg-sage-50 rounded-lg border border-sage-200">
            <div className="flex justify-between text-sm">
              <span className="text-sage-700">Total Items:</span>
              <span className="font-medium text-sage-900">{totalItems} units</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-sage-700">Estimated Value:</span>
              <span className="font-medium text-sage-900">${estimatedValue.toFixed(2)}</span>
            </div>
            <p className="text-xs text-sage-600 mt-2">*Final pricing may vary based on quantity, shipping, and terms</p>
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <h3 className="font-semibold mb-4 text-sage-800">Company Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company" className="text-sage-700">
                Company Name *
              </Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className="border-sage-300 focus:border-sage-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact" className="text-sage-700">
                Contact Person *
              </Label>
              <Input
                id="contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your full name"
                className="border-sage-300 focus:border-sage-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sage-700">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="border-sage-300 focus:border-sage-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sage-700">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="border-sage-300 focus:border-sage-500"
              />
            </div>
            <div>
              <Label htmlFor="country" className="text-sage-700">
                Country *
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Your country"
                className="border-sage-300 focus:border-sage-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-sage-700">
                Additional Message
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please include any specific requirements, delivery preferences, or questions..."
                className="border-sage-300 focus:border-sage-500"
                rows={4}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSubmitInquiry}
              disabled={!companyName || !contactName || !email || !country || inquiryItems.length === 0}
              className="flex-1 bg-sage-600 hover:bg-sage-700"
            >
              Submit Inquiry
            </Button>
            <Button variant="outline" onClick={onClearInquiry} className="border-sage-300 text-sage-700 bg-transparent">
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

function ProductCard({ 
  product, 
  onAddToInquiry, 
  showCurrency 
}: { 
  product: ProductWithImages; 
  onAddToInquiry: (product: ProductWithImages, quantity: number) => void;
  showCurrency: "usd" | "eur" | "both";
}) {
  const [inquiryQuantity, setInquiryQuantity] = useState(product.series?.pieces_per_case || 1)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sage-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
      {/* Product Image - Ana odak */}
      <div 
        className="relative h-64 bg-gradient-to-br from-sage-50 to-sage-100 p-4 cursor-pointer group"
        onClick={() => {
          setCurrentImageIndex(0)
          setShowImagePreview(true)
        }}
      >
        <div className="w-full h-full relative transition-transform duration-700 ease-out group-hover:scale-110">
          <Image 
            src={product.product_images?.[0]?.image_url || "/placeholder.svg"} 
            alt={product.name} 
            fill 
            className="object-contain drop-shadow-lg transition-all duration-500 group-hover:drop-shadow-2xl"
            quality={100}
            unoptimized={false}
            priority={false}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ 
              imageRendering: 'auto',
              msInterpolationMode: 'bicubic'
            } as React.CSSProperties}
          />
        </div>
        
        {/* Image count indicator */}
        {product.product_images && product.product_images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {product.product_images.length} images
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none"></div>
        
        {/* Preview label */}
        <div className="absolute bottom-2 left-2 right-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-xs text-sage-700 bg-white/90 px-2 py-1 rounded-full backdrop-blur-sm">
            Click to preview
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-sage-900 mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-sage-600 text-sm mb-1 line-clamp-1">{product.catalog_description || ''}</p>
          <p className="text-sage-500 text-xs">{product.series?.name || ''}</p>
        </div>

        {/* Price - Prominent */}
        <div className="bg-gradient-to-r from-sage-100 to-sage-200 rounded-lg p-3 text-center border border-sage-200 mb-3">
          {showCurrency === "both" ? (
            <div className="space-y-1">
              <div className="text-lg font-bold text-sage-900">
                {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
              </div>
              <div className="text-sm font-semibold text-sage-700">
                {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
              </div>
            </div>
          ) : showCurrency === "eur" ? (
            <div className="text-xl font-bold text-sage-900">
              {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
            </div>
          ) : (
            <div className="text-xl font-bold text-sage-900">
              {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-sage-600">
          <div>Units/Case: <span className="font-semibold text-sage-800">{product.series?.pieces_per_case || 1}</span></div>
          <div>Weight: <span className="font-semibold text-sage-800">{product.series?.net_weight_kg_per_piece || 'N/A'} kg</span></div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInquiryQuantity(Math.max(product.series?.pieces_per_case || 1, inquiryQuantity - (product.series?.pieces_per_case || 1)))}
              className="px-2 h-7 text-sage-600 hover:bg-sage-50"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="px-2 py-1 text-sm font-semibold min-w-[2rem] text-center">{inquiryQuantity}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInquiryQuantity(inquiryQuantity + (product.series?.pieces_per_case || 1))}
              className="px-2 h-7 text-sage-600 hover:bg-sage-50"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button
            onClick={() => onAddToInquiry(product, inquiryQuantity)}
            size="sm"
            className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 active:bg-gradient-to-r active:from-emerald-600 active:to-emerald-700"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Same Image Preview Modal as ProductRow */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-sage-200/50 shadow-2xl">
          <DialogTitle className="sr-only">{product.name} - Product Preview</DialogTitle>

          {/* Header with product info */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/90 via-white/80 to-transparent backdrop-blur-sm p-6 border-b border-sage-200/30">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-sage-900">{product.name}</h1>
                <p className="text-sage-600 text-lg mb-2">{product.catalog_description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="bg-sage-100/80 backdrop-blur-sm text-sage-700 px-3 py-1 rounded-full border border-sage-200">
                    {product.series?.name || 'Product Series'}
                  </span>
                  {showCurrency === "both" ? (
                    <div className="flex gap-2">
                      <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                        {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                      </span>
                      <span className="bg-sage-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                        {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                      </span>
                    </div>
                  ) : showCurrency === "eur" ? (
                    <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                      {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                    </span>
                  ) : (
                    <span className="bg-sage-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full">
                      {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowImagePreview(false)}
                className="text-sage-400 hover:text-sage-600 text-2xl font-light transition-colors bg-white/50 hover:bg-white/80 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main image area */}
          <div className="relative w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-sage-50/30 to-sage-100/20">
            <div className="relative max-w-[85vw] max-h-[85vh] w-full h-full bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-sage-200/30">
              <Image 
                src={product.product_images?.[currentImageIndex]?.image_url || product.product_images?.[0]?.image_url || "/placeholder.svg"} 
                alt={product.name} 
                fill 
                className="object-contain drop-shadow-2xl cursor-zoom-in hover:scale-105 transition-transform duration-500"
                quality={100}
                unoptimized={false}
                priority={true}
                sizes="95vw"
                style={{ 
                  imageRendering: 'auto',
                  msInterpolationMode: 'bicubic'
                } as React.CSSProperties}
              />
            </div>

            {/* Image navigation arrows */}
            {product.product_images && product.product_images.length > 1 && (
              <>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : product.product_images.length - 1)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-sage-600 p-3 rounded-full transition-all duration-200 border border-sage-200 shadow-lg hover:shadow-xl"
                  >
                    ←
                  </button>
                </div>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev < product.product_images.length - 1 ? prev + 1 : 0)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-sage-600 p-3 rounded-full transition-all duration-200 border border-sage-200 shadow-lg hover:shadow-xl"
                  >
                    →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bottom info panel */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white/90 via-white/80 to-transparent backdrop-blur-sm p-6 border-t border-sage-200/30">
            <div className="grid grid-cols-5 gap-6 text-center">
              <div>
                <p className="text-sage-600 text-sm mb-1">Barcode</p>
                <p className="font-mono text-lg text-sage-800">{product.barcode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Units per Case</p>
                <p className="text-2xl font-bold text-sage-900">{product.series?.pieces_per_case || 1}</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Weight per Unit</p>
                <p className="text-xl font-semibold text-sage-800">{product.series?.net_weight_kg_per_piece || 'N/A'} kg</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Net Weight per Case</p>
                <p className="text-xl font-semibold text-sage-800">{product.series?.net_weight_kg_per_case || 'N/A'} kg</p>
              </div>
              <div>
                <p className="text-sage-600 text-sm mb-1">Unit Price</p>
                {showCurrency === "both" ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                    </p>
                    <p className="text-lg font-semibold text-green-500">
                      {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                    </p>
                  </div>
                ) : showCurrency === "eur" ? (
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice((product.price_per_piece_usd || product.price_per_piece || 0) * USD_TO_EUR_RATE, 'EUR')}
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(product.price_per_piece_usd || product.price_per_piece || 0, 'USD')}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                onClick={() => {
                  onAddToInquiry(product, product.series?.pieces_per_case || 1)
                  setShowImagePreview(false)
                }}
                className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white px-8 py-3 text-lg font-medium shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 active:bg-gradient-to-r active:from-emerald-600 active:to-emerald-700"
              >
                Add to Inquiry
              </Button>
              <Button
                variant="outline"
                className="border-2 border-sage-300 text-sage-700 hover:bg-sage-100 px-8 py-3 text-lg backdrop-blur-sm bg-white/50"
              >
                Download Image
              </Button>
              <Button
                variant="outline"
                className="border-2 border-sage-300 text-sage-700 hover:bg-sage-100 px-8 py-3 text-lg backdrop-blur-sm bg-white/50"
              >
                Share Product
              </Button>
            </div>
          </div>

          {/* Image thumbnails */}
          {product.product_images && product.product_images.length > 1 && (
            <div className="absolute left-8 bottom-24 z-10">
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {product.product_images.map((image, index) => (
                  <div 
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg cursor-pointer transition-all duration-200 ${
                      index === currentImageIndex 
                        ? 'bg-white/90 border-2 border-sage-500 scale-110' 
                        : 'bg-white/70 border border-sage-300 hover:bg-white/80'
                    }`}
                  >
                    <Image 
                      src={image.image_url} 
                      alt={`Thumbnail ${index + 1}`} 
                      width={64} 
                      height={64} 
                      className="object-contain w-full h-full"
                      quality={100}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image info indicator */}
          <div className="absolute top-20 right-8 z-10 text-sage-500 text-sm bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-sage-200">
            {product.product_images && product.product_images.length > 1 
              ? `${currentImageIndex + 1}/${product.product_images.length} • ESC to close`
              : 'Click image to zoom • ESC to close'
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function OlivosCatalog() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [categories, setCategories] = useState<string[]>(["All"])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [showCurrency, setShowCurrency] = useState<"usd" | "eur" | "both">("usd")
  const [inquiryItems, setInquiryItems] = useState<any[]>([])
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  // Supabase'den ürünleri çek
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        // Ürünleri ve series bilgilerini çek
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            series(*)
          `)
          .eq('catalog_visible', true)
          .eq('is_active', true)
          .order('catalog_sort_order')

        if (productsError) {
          console.error('Error fetching products:', productsError)
          return
        }

        // Her ürün için görsellerini ayrı ayrı çek
        const productsWithImages = await Promise.all(
          (productsData || []).map(async (product) => {
            const { data: imagesData, error: imagesError } = await supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('image_order')

            if (imagesError) {
              console.error('Error fetching images for product:', product.id, imagesError)
            }

            return {
              ...product,
              product_images: imagesData || []
            }
          })
        )

        setProducts(productsWithImages)

        // Kategorileri (series names) çek ve tekrarsızlaştır
        const uniqueCategories = ["All", ...new Set(
          productsWithImages
            .map(p => p.series?.name)
            .filter(Boolean)
        )] as string[]
        
        setCategories(uniqueCategories)
        console.log('Loaded products:', productsWithImages.length)
        console.log('Categories:', uniqueCategories.length)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.catalog_description && product.catalog_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.barcode && product.barcode.includes(searchTerm))
    const matchesCategory = selectedCategory === "All" || (product.series?.name === selectedCategory)

    return matchesSearch && matchesCategory
  })

  const handleAddToInquiry = (product: ProductWithImages, quantity: number) => {
    // Animasyon başlat
    setIsAddingToCart(true)
    
    setTimeout(() => {
    const existingItem = inquiryItems.find((item) => item.product.id === product.id)
    if (existingItem) {
      setInquiryItems(
        inquiryItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        ),
      )
    } else {
      setInquiryItems([...inquiryItems, { product, quantity }])
    }
      
      // Başarı animasyonu
      setIsAddingToCart(false)
      setJustAdded(true)
      
      // 2 saniye sonra normal renge dön
      setTimeout(() => {
        setJustAdded(false)
      }, 2000)
    }, 500) // 0.5 saniye animasyon
  }

  const handleRemoveFromInquiry = (productId: string) => {
    setInquiryItems(inquiryItems.filter((item) => item.product.id !== productId))
  }

  const handleUpdateInquiryQuantity = (productId: string, newQuantity: number) => {
    setInquiryItems(
      inquiryItems.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)),
    )
  }

  const handleClearInquiry = () => {
    setInquiryItems([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mx-auto mb-4"></div>
          <p className="text-sage-600">Loading OLIVOS Catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white relative">
      {/* PDF Export Loading Overlay */}
      {isExportingPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sage-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-sage-800 mb-2">Preparing Your PDF</h3>
            <p className="text-sage-600 mb-4">Loading product images and generating catalog...</p>
            <div className="w-full bg-sage-100 rounded-full h-2">
              <div className="bg-sage-600 h-2 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-sage-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-sage-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-4xl font-bold text-sage-900 tracking-wide">OLIVOS</h1>
                <p className="text-sm text-sage-600 mt-1">SOAP & SKINCARE</p>
              </div>
              <div className="hidden md:flex items-center gap-6 text-sm text-sage-600">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Worldwide Export</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-sage-800">OLIVOS 2025 PRODUCT LIST</h2>
            </div>
          </div>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="bg-white border-b border-sage-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sage-500 h-4 w-4" />
                <Input
                  placeholder="Search products or barcodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80 border-sage-300 focus:border-sage-500"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 border-sage-300">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-sage-300 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-none px-3 h-8 ${viewMode === "list" ? "bg-sage-600 text-white" : "text-sage-600 hover:bg-sage-50"}`}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-none px-3 h-8 ${viewMode === "grid" ? "bg-sage-600 text-white" : "text-sage-600 hover:bg-sage-50"}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>

              {/* Currency Toggle */}
              <div className="flex items-center border border-sage-300 rounded-lg overflow-hidden">
                <Button
                  variant={showCurrency === "usd" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowCurrency("usd")}
                  className={`rounded-none px-3 h-8 text-xs ${showCurrency === "usd" ? "bg-sage-600 text-white" : "text-sage-600 hover:bg-sage-50"}`}
                >
                  USD
                </Button>
                <Button
                  variant={showCurrency === "eur" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowCurrency("eur")}
                  className={`rounded-none px-3 h-8 text-xs ${showCurrency === "eur" ? "bg-sage-600 text-white" : "text-sage-600 hover:bg-sage-50"}`}
                >
                  EUR
                </Button>
                <Button
                  variant={showCurrency === "both" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowCurrency("both")}
                  className={`rounded-none px-3 h-8 text-xs ${showCurrency === "both" ? "bg-sage-600 text-white" : "text-sage-600 hover:bg-sage-50"}`}
                >
                  USD+EUR
                </Button>
              </div>

            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  try {
                    setIsExportingPDF(true)
                    console.log('PDF export başlatılıyor...')
                    await exportToPDF(filteredProducts, showCurrency)
                    console.log('PDF export tamamlandı!')
                  } catch (error) {
                    console.error('PDF export hatası:', error)
                  } finally {
                    setIsExportingPDF(false)
                  }
                }}
                disabled={isExportingPDF}
                className="border-sage-300 text-sage-700 bg-transparent hover:bg-sage-50 transition-colors disabled:opacity-50"
              >
                {isExportingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sage-600 mr-2"></div>
                    Preparing PDF...
                  </>
                ) : (
                  <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
                  </>
                )}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className={`transition-all duration-500 transform ${
                      isAddingToCart 
                        ? "bg-amber-500 hover:bg-amber-600 scale-110 animate-pulse" 
                        : justAdded 
                          ? "bg-emerald-600 hover:bg-emerald-700 scale-105 shadow-lg shadow-emerald-200" 
                          : inquiryItems.length > 0 
                            ? "bg-sage-700 hover:bg-sage-800 shadow-md" 
                            : "bg-sage-600 hover:bg-sage-700"
                    }`}
                  >
                    {isAddingToCart ? "Adding..." : justAdded ? "Added!" : "Inquiry List"} ({inquiryItems.length})
                  </Button>
                </DialogTrigger>
                <InquiryDialog
                  inquiryItems={inquiryItems}
                  onRemoveItem={handleRemoveFromInquiry}
                  onUpdateQuantity={handleUpdateInquiryQuantity}
                  onClearInquiry={handleClearInquiry}
                />
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog */}
      <div className="container mx-auto px-6 py-8">
        {viewMode === "list" ? (
          <div className="space-y-1 overflow-visible">
          {filteredProducts.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                onAddToInquiry={handleAddToInquiry}
                showCurrency={showCurrency}
              />
          ))}
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToInquiry={handleAddToInquiry}
                showCurrency={showCurrency}
              />
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sage-600 mb-4">No products found matching your criteria.</p>
            <Button
              variant="outline"
              className="border-sage-300 text-sage-700 bg-transparent"
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("All")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-sage-800 text-white py-8 mt-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">OLIVOS</h3>
              <p className="text-sage-200 text-sm">
                Premium soap and skincare products for worldwide export. Quality guaranteed since 1956.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Export Information</h4>
              <ul className="space-y-2 text-sm text-sage-200">
                <li>• Minimum order quantities apply</li>
                <li>• Worldwide shipping available</li>
                <li>• Custom packaging options</li>
                <li>• Quality certifications included</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-sage-200">
                <p>Email: export@olivos.com</p>
                <p>Phone: +90 212 555 0123</p>
                <p>Address: Istanbul, Turkey</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
