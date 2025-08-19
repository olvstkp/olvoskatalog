"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  ZoomInIcon as Zoom,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock product data - in real app this would come from API
const product = {
  id: 1,
  name: "Selene's Serenity Goat Milk Liquid Soap",
  category: "Natural Soaps",
  price: 3.42,
  originalPrice: 4.2,
  images: [
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
  ],
  aroma: "Lavender",
  skinType: ["Sensitive", "Dry"],
  ingredients: ["Goat Milk", "Olive Oil", "Lavender Extract", "Vitamin E", "Natural Glycerin", "Coconut Oil"],
  usage: "Face & Body",
  volume: "500 ML",
  inStock: true,
  rating: 4.8,
  reviews: 124,
  description:
    "Experience the luxurious touch of our Selene's Serenity Goat Milk Liquid Soap. Crafted with premium goat milk and enriched with nourishing olive oil, this gentle formula provides deep moisturization while cleansing your skin. The calming lavender scent creates a spa-like experience in your daily routine.",
  benefits: [
    "Deep moisturization with goat milk proteins",
    "Gentle cleansing suitable for sensitive skin",
    "Rich in vitamins A, B6, B12, and E",
    "Natural anti-aging properties",
    "Calming lavender aromatherapy",
  ],
  howToUse:
    "Apply a small amount to wet hands or washcloth. Gently massage onto skin to create a rich lather. Rinse thoroughly with warm water. For best results, use daily on face and body.",
  specifications: {
    "Product Code": "OLV-SGM-500",
    Volume: "500 ML",
    "pH Level": "5.5-6.5",
    "Shelf Life": "24 months",
    Origin: "Turkey",
    Certification: "Organic, Cruelty-Free",
  },
}

export default function ProductDetail() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Catalog
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-bold text-sage-800">OLIVOS</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white shadow-lg">
              <Image
                src={product.images[currentImageIndex] || "/placeholder.svg"}
                alt={product.name}
                fill
                className={`object-cover transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <Zoom className="h-4 w-4" />
              </Button>
              {product.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex ? "border-sage-600" : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name} view ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category}
              </Badge>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                  <span className="text-sm font-medium ml-1">{product.rating}</span>
                </div>
                <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-sage-600">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-xl text-muted-foreground line-through">${product.originalPrice}</span>
              )}
              {product.originalPrice > product.price && (
                <Badge className="bg-red-500">Save ${(product.originalPrice - product.price).toFixed(2)}</Badge>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Product Attributes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Aroma:</span>
                <Badge variant="secondary" className="ml-2">
                  {product.aroma}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Volume:</span>
                <span className="ml-2 font-medium">{product.volume}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Usage:</span>
                <span className="ml-2 font-medium">{product.usage}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Stock:</span>
                <Badge variant={product.inStock ? "default" : "secondary"} className="ml-2">
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-muted-foreground">Suitable for:</span>
              <div className="flex gap-2 mt-1">
                {product.skinType.map((type) => (
                  <Badge key={type} variant="outline">
                    {type} Skin
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3"
                  >
                    -
                  </Button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} className="px-3">
                    +
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button size="lg" className="flex-1 bg-sage-600 hover:bg-sage-700" disabled={!product.inStock}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart - ${(product.price * quantity).toFixed(2)}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={isWishlisted ? "text-red-500 border-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="usage">How to Use</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                  <div>
                    <h4 className="font-semibold mb-2">Key Benefits:</h4>
                    <ul className="space-y-1">
                      {product.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-sage-600 mt-1">•</span>
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ingredients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {product.ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="outline" className="justify-center py-2">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>How to Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{product.howToUse}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-muted">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
