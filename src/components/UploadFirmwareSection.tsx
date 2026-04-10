import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Icon from "@/components/ui/icon"
import func2url from "../../backend/func2url.json"

export function UploadFirmwareSection() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    car: "",
    comment: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFile = (f: File) => {
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setStatus("loading")

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1]
      try {
        const res = await fetch((func2url as Record<string, string>)["upload-firmware"], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            file: base64,
            fileName: file.name,
          }),
        })
        if (!res.ok) throw new Error()
        setStatus("success")
        setFormData({ name: "", phone: "", car: "", comment: "" })
        setFile(null)
      } catch {
        setStatus("error")
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <section id="upload" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-3xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            Загрузка прошивки
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
            Отправьте файл{" "}
            <span className="text-primary">на редактирование</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Загрузите файл прошивки вашего ЭБУ — мы свяжемся с вами и обсудим параметры доработки.
          </p>
        </div>

        <Card className="border-none shadow-xl bg-background">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Icon name="Upload" size={20} className="text-primary" />
              Форма загрузки прошивки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Имя *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ваше имя"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Телефон</label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 900 123-45-67"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Марка, модель, двигатель</label>
                <Input
                  name="car"
                  value={formData.car}
                  onChange={handleChange}
                  placeholder="Например: BMW E46 2.0d M47"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Комментарий</label>
                <Textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Что нужно изменить в прошивке..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Файл прошивки *</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : file
                      ? "border-green-500 bg-green-500/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <Icon name="FileCheck" size={32} className="text-green-500" />
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} КБ
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Icon name="UploadCloud" size={32} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Перетащите файл сюда или <span className="text-primary">выберите</span>
                      </p>
                      <p className="text-xs text-muted-foreground">.bin, .ori, .hex и другие форматы</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto group"
                disabled={status === "loading" || !file}
              >
                <Icon name="Send" size={16} className="mr-2 group-hover:translate-x-1 transition-transform" />
                {status === "loading" ? "Отправляем..." : "Отправить на редактирование"}
              </Button>

              {status === "success" && (
                <p className="text-sm text-green-500 font-medium">
                  Файл успешно отправлен! Мы свяжемся с вами в ближайшее время.
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-500 font-medium">
                  Ошибка отправки. Напишите нам напрямую в Telegram.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
