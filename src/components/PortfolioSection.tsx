import { Card, CardContent } from "@/components/ui/card"

const projects = [
  {
    title: "BMW 3 Series (F30) — Stage 2",
    category: "Чип-тюнинг",
    description:
      "Двигатель N20 2.0T. Мощность увеличена с 184 до 260 л.с., крутящий момент с 270 до 380 Нм. Отключён ограничитель скорости, оптимизированы таблицы зажигания и давления турбины.",
    tags: ["Stage 2", "N20", "+76 л.с.", "BMW"],
    result: "+76 л.с.",
  },
  {
    title: "Volkswagen Golf GTI (Mk7) — Stage 1",
    category: "Прошивка + Экономия топлива",
    description:
      "Двигатель EA888 1.8 TSI. Прошивка Stage 1 с оптимизацией расхода топлива. Прирост мощности +45 л.с., экономия топлива до 1.5 л/100 км.",
    tags: ["Stage 1", "EA888", "Экономия", "VAG"],
    result: "+45 л.с.",
  },
  {
    title: "Kia Stinger 3.3T — Индивидуальная калибровка",
    category: "Редактирование ЭБУ",
    description:
      "Двигатель Lambda 3.3 V6 Turbo. Индивидуальная настройка прошивки с адаптацией под высокооктановый бензин. Мощность возросла с 370 до 430 л.с.",
    tags: ["Индивидуальный", "3.3T", "+60 л.с.", "Kia"],
    result: "+60 л.с.",
  },
  {
    title: "Mercedes-Benz C200 (W205) — DPF/EGR Off",
    category: "Удаление фильтров",
    description:
      "Дизельный двигатель OM274 2.0D. Программное удаление сажевого фильтра (DPF) и клапана EGR. Восстановление тяги и устранение хронических ошибок ЭБУ.",
    tags: ["DPF Off", "EGR Off", "Дизель", "Mercedes"],
    result: "Ошибки устранены",
  },
]

export function PortfolioSection() {
  return (
    <section id="portfolio" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">Примеры наших работ</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Реальные результаты для реальных автомобилей — посмотрите, чего мы уже достигли для наших клиентов.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card
              key={index}
              className="group overflow-hidden border hover:border-primary shadow-md hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-primary font-semibold">{project.category}</p>
                  <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {project.result}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{project.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
