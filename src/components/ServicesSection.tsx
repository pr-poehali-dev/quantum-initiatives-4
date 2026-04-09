import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Wrench, Headphones, RotateCcw, Gauge, FileCode } from "lucide-react"

const services = [
  {
    icon: ShoppingCart,
    title: "Продажа прошивок",
    description:
      "Готовые прошивки для популярных моделей авто: Stage 1, Stage 2, экономичные карты. Мгновенная доставка файла после оплаты. Поддержка всех форматов: BIN, HEX, ORI.",
  },
  {
    icon: FileCode,
    title: "Редактирование ЭБУ",
    description:
      "Индивидуальная калибровка прошивки под ваш двигатель. Оптимизация таблиц зажигания, топливных карт, давления турбины. Работаем с Bosch, Siemens, Delphi, Magneti Marelli.",
  },
  {
    icon: Gauge,
    title: "Чип-тюнинг",
    description:
      "Увеличение мощности и крутящего момента без механических доработок. Удаление ограничителей скорости, оптимизация под газ/этанол, отключение EGR и DPF.",
  },
  {
    icon: Headphones,
    title: "Помощь в прошивке",
    description:
      "Онлайн-поддержка при самостоятельной прошивке ЭБУ. Консультации по выбору оборудования, пошаговые инструкции, помощь в диагностике ошибок в режиме реального времени.",
  },
  {
    icon: RotateCcw,
    title: "Восстановление прошивки",
    description:
      "Восстановление заводской прошивки после неудачного чип-тюнинга. Снятие блокировок, восстановление «битых» ЭБУ, возврат к стоковым настройкам.",
  },
  {
    icon: Wrench,
    title: "Диагностика ЭБУ",
    description:
      "Считывание и анализ ошибок блока управления. Чтение live-данных, проверка датчиков, диагностика неисправностей и рекомендации по устранению — удалённо или по файлу.",
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mx-auto block w-fit">
          Наша экспертиза
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-balance">
          В чем мы <span className="text-primary">сильны</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed text-lg">
          От продажи готовых прошивок до индивидуальной калибровки и полной поддержки — весь цикл работы с ЭБУ в одном месте.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="group hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-background/50 backdrop-blur-sm"
            >
              <CardHeader>
                <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <service.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{service.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
