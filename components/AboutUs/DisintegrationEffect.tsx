"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useAccessibility } from "../AccessibilityProvider"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

interface DisintegrationEffectProps {
  imageSrc: string
  altText: string
  onComplete?: () => void
  index?: number
  scrollTriggerEnabled?: boolean
}

export default function DisintegrationEffect({
  imageSrc,
  altText,
  onComplete,
  index = 0,
  scrollTriggerEnabled = false,
}: DisintegrationEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [canvasElements, setCanvasElements] = useState<HTMLCanvasElement[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { highContrast } = useAccessibility()

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Ajustar parámetros según el dispositivo
  const COUNT = isMobile ? 50 : 75
  const REPEAT_COUNT = isMobile ? 2 : 3

  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !containerRef.current) return

    // Si estamos en móvil y no se requiere la animación de scroll, simplemente mostramos la imagen
    if (isMobile && !scrollTriggerEnabled) {
      return
    }

    // Si está en modo de alto contraste, no aplicar el efecto de desintegración
    if (highContrast) {
      if (imageRef.current) {
        imageRef.current.style.opacity = "1"
      }
      return
    }

    const createCanvases = async () => {
      const img = imageRef.current
      if (!img) return

      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Create circular clipping path
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      ctx.drawImage(img, 0, 0, img.width, img.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const dataList = []

      img.style.display = "none"

      for (let i = 0; i < COUNT; i++) {
        dataList.push(ctx.createImageData(canvas.width, canvas.height))
      }

      for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
          for (let l = 0; l < REPEAT_COUNT; l++) {
            const index = (x + y * canvas.width) * 4
            const dataIndex = Math.floor((COUNT * (Math.random() + (2 * x) / canvas.width)) / 3)

            if (dataIndex < dataList.length) {
              for (let p = 0; p < 4; p++) {
                dataList[dataIndex].data[index + p] = imageData.data[index + p]
              }
            }
          }
        }
      }

      const canvasElements: HTMLCanvasElement[] = []

      dataList.forEach((data) => {
        const clonedCanvas = canvas.cloneNode() as HTMLCanvasElement
        const clonedCtx = clonedCanvas.getContext("2d")

        if (clonedCtx) {
          // Create circular clipping path for each cloned canvas
          clonedCtx.beginPath()
          clonedCtx.arc(clonedCanvas.width / 2, clonedCanvas.height / 2, clonedCanvas.width / 2, 0, Math.PI * 2)
          clonedCtx.closePath()
          clonedCtx.clip()

          clonedCtx.putImageData(data, 0, 0)
          clonedCanvas.className = "absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"
          containerRef.current?.appendChild(clonedCanvas)
          canvasElements.push(clonedCanvas)
        }
      })

      setCanvasElements(canvasElements)
    }

    createCanvases()
  }, [imageLoaded, COUNT, REPEAT_COUNT, isMobile, scrollTriggerEnabled, highContrast])

  useEffect(() => {
    if (canvasElements.length === 0) return

    // Si está en modo de alto contraste, no aplicar el efecto de desintegración
    if (highContrast) return

    // Si no se requiere la animación de scroll, no configuramos el ScrollTrigger
    if (!scrollTriggerEnabled) {
      return
    }

    const timeline = gsap.timeline({
      scrollTrigger: scrollTriggerEnabled
        ? {
            trigger: containerRef.current,
            start: "top 20%", // Comienza cuando la imagen está más arriba en la pantalla
            end: "bottom top", // Termina cuando la imagen sale por arriba
            scrub: 1.5, // Suavizado
          }
        : null,
      onComplete: () => onComplete?.(), // Moved onComplete to the timeline level
    })

    canvasElements.forEach((canvas, i) => {
      const randomAngle = (Math.random() - 0.5) * 2 * Math.PI
      const randomRotationAngle = 30 * (Math.random() - 0.5)

      timeline.to(
        canvas,
        {
          rotation: randomRotationAngle,
          x: `+=${40 * Math.sin(randomAngle)}`,
          y: `+=${40 * Math.cos(randomAngle)}`,
          opacity: 0,
          delay: (i / canvasElements.length) * 2,
        },
        index * 0.2 + 0.5, // Añadido retraso adicional
      )
    })

    return () => {
      canvasElements.forEach((canvas) => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }
      })

      if (scrollTriggerEnabled) {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
      }
    }
  }, [canvasElements, onComplete, index, scrollTriggerEnabled, highContrast])

  return (
    <div ref={containerRef} className="relative w-full h-full profile-image-container flex items-center justify-center">
      <Image
        ref={imageRef as any}
        src={imageSrc || "/placeholder.svg"}
        alt={altText}
        width={600}
        height={600}
        className={`object-cover w-full h-full rounded-full ${
          (isMobile && !scrollTriggerEnabled) || highContrast ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setImageLoaded(true)}
        priority
        quality={100}
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
    </div>
  )
}
