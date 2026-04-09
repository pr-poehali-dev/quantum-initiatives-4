import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Cpu, CheckCircle, ArrowRight } from "lucide-react"
import { Fragment } from "react"

const steps = [
  {
    icon: Search,
    title: "Диагностика и заказ",
    description:
      "Вы выбираете нужную услугу: покупка готовой прошивки, индивидуальное редактирование или помощь в прошивке. Мы уточняем марку, модель, объём двигателя и цели.",
    number: "01",
  },
  {
    icon: Cpu,
    title: "Подготовка прошивки",
    description:
      "Готовим или редактируем файл прошивки под ваш автомобиль. Проверяем параметры, оптимизируем таблицы и тестируем результат перед отправкой.",
    number: "02",
  },
  {
    icon: CheckCircle,
    title: "Прошивка и поддержка",
    description:
      "Отправляем готовый файл или помогаем в процессе прошивки онлайн. После завершения проверяем ошибки, отвечаем на вопросы и остаёмся на связи.",
    number: "03",
  },
]

export function ProcessSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            Как мы работаем
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">
            От <span className="text-primary">заявки</span> до <span className="text-primary">результата</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Три простых шага — и ваш автомобиль прошит, протестирован и готов к эксплуатации.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <Fragment key={index}>
              <Card
                className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-background"
              >
                <div className="absolute top-0 right-0 text-[120px] font-bold bg-gradient-to-br from-primary/10 to-primary/5 bg-clip-text text-transparent leading-none p-4">
                  {step.number}
                </div>
                <CardHeader>
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 w-fit group-hover:scale-110 group-hover:rotate-6">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
              {index < steps.length - 1 && (
                <div
                  className="hidden md:flex items-center justify-center absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${(index + 1) * 33.33 - 4}%` }}
                >
                  <ArrowRight className="h-8 w-8 text-primary animate-pulse" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}