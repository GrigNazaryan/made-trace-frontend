const keys = [
  "calendar_title", "calendar_previous", "calendar_today", "calendar_next", "calendar_date",
  "calendar_view", "calendar_month", "calendar_week", "calendar_day", "calendar_open", "orders_load_more",
  "action_queue", "action_review_request", "action_wait_quote", "action_plan_order", "action_wait_proof",
  "action_track_production", "action_fulfill_order", "action_read_messages", "order_next_action",
  "reports_accepted_quotes", "catalog_custom_color", "catalog_add_color", "catalog_size_adjustment",
  "catalog_advanced_variants", "confirm_unsaved_product", "confirm_replace_product",
  "estimate_calculate", "estimate_not_quote", "estimate_by_workshop", "artwork_upload_failed",
  "err_draft_conflict", "confirm_reload_draft", "reload_saved_draft",
  "err_artwork_access_denied", "err_artwork_draft_required", "err_request_id_conflict",
];

const labels = {
  en: [
    "Production calendar", "Previous period", "Today", "Next period", "Calendar date", "Calendar view", "Month", "Week", "Day", "Active orders only", "Load more orders",
    "Needs attention", "Review the request", "Waiting for quote decision", "Plan production", "Waiting for artwork approval", "Track production", "Prepare for delivery", "Read new messages", "Next step",
    "Accepted quotes for completed orders", "Choose a color", "Add color", "Price adjustment", "Custom sizes and color codes", "Leave without saving your product changes?", "Changing the product removes the current designs for this item. Continue?",
    "Calculate estimate", "Preliminary price. The workshop will confirm the quote.", "The workshop will price this request.", "The image could not be uploaded. Check the file and try again.",
    "This draft changed in another tab. Load the saved copy before sending.", "Replace the edits in this tab with the saved draft?", "Load saved draft",
    "This artwork is not available for this order.", "Save the order draft and retry the upload.", "The previous submission does not match these order details. Review the request and retry.",
  ],
  ru: [
    "Календарь производства", "Предыдущий период", "Сегодня", "Следующий период", "Дата календаря", "Вид календаря", "Месяц", "Неделя", "День", "Только активные заказы", "Показать ещё заказы",
    "Требует внимания", "Рассмотреть заявку", "Ждём ответа по смете", "Запланировать производство", "Ждём согласования макета", "Следить за производством", "Подготовить к передаче", "Прочитать новые сообщения", "Следующий шаг",
    "Принятые сметы завершённых заказов", "Выбрать цвет", "Добавить цвет", "Доплата за размер", "Свои размеры и коды цветов", "Уйти без сохранения изменений товара?", "При смене товара макеты этой позиции будут удалены. Продолжить?",
    "Рассчитать предварительную цену", "Это предварительная цена. Итоговую смету подтвердит мастерская.", "Цену этого заказа рассчитает мастерская.", "Не удалось загрузить изображение. Проверьте файл и повторите попытку.",
    "Черновик изменился в другой вкладке. Перед отправкой загрузите сохранённую версию.", "Заменить правки в этой вкладке сохранённым черновиком?", "Загрузить сохранённый черновик",
    "Этот макет недоступен для данного заказа.", "Сохраните черновик и повторите загрузку.", "Предыдущая отправка не совпадает с данными заказа. Проверьте заявку и повторите попытку.",
  ],
  hy: [
    "Արտադրության օրացույց", "Նախորդ ժամանակահատվածը", "Այսօր", "Հաջորդ ժամանակահատվածը", "Օրացույցի ամսաթիվ", "Օրացույցի տեսք", "Ամիս", "Շաբաթ", "Օր", "Միայն ակտիվ պատվերները", "Ցույց տալ ավելի շատ պատվերներ",
    "Ուշադրություն է պահանջվում", "Դիտարկել հայտը", "Սպասվում է նախահաշվի պատասխանը", "Պլանավորել արտադրությունը", "Սպասվում է դիզայնի հաստատումը", "Հետևել արտադրությանը", "Պատրաստել հանձնման", "Կարդալ նոր հաղորդագրությունները", "Հաջորդ քայլը",
    "Ավարտված պատվերների ընդունված նախահաշիվները", "Ընտրել գույնը", "Ավելացնել գույն", "Չափի հավելավճար", "Անհատական չափեր և գունային կոդեր", "Դուրս գա՞լ առանց փոփոխությունները պահպանելու։", "Ապրանքը փոխելիս այս տողի դիզայնները կհեռացվեն։ Շարունակե՞լ։",
    "Հաշվել նախնական գինը", "Սա նախնական գին է։ Արհեստանոցը կհաստատի վերջնական նախահաշիվը։", "Գինը կհաշվի արհեստանոցը։", "Պատկերը չհաջողվեց վերբեռնել։ Ստուգեք ֆայլը և կրկին փորձեք։",
    "Սևագիրը փոխվել է մեկ այլ ներդիրում։ Նախ բեռնեք պահպանված տարբերակը։", "Փոխարինե՞լ այս ներդիրի փոփոխությունները պահպանված սևագրով։", "Բեռնել պահպանված սևագիրը",
    "Այս դիզայնը հասանելի չէ այս պատվերի համար։", "Պահպանեք սևագիրը և կրկին փորձեք վերբեռնել։", "Նախորդ հայտը չի համապատասխանում այս պատվերին։ Ստուգեք և կրկին փորձեք։",
  ],
  de: [
    "Produktionskalender", "Vorheriger Zeitraum", "Heute", "Nächster Zeitraum", "Kalenderdatum", "Kalenderansicht", "Monat", "Woche", "Tag", "Nur aktive Aufträge", "Weitere Aufträge laden",
    "Handlungsbedarf", "Anfrage prüfen", "Warten auf die Angebotsentscheidung", "Produktion planen", "Warten auf Motivfreigabe", "Produktion verfolgen", "Übergabe vorbereiten", "Neue Nachrichten lesen", "Nächster Schritt",
    "Angenommene Angebote abgeschlossener Aufträge", "Farbe auswählen", "Farbe hinzufügen", "Größenzuschlag", "Eigene Größen und Farbcodes", "Produktänderungen verwerfen?", "Ein Produktwechsel entfernt die Motive dieser Position. Fortfahren?",
    "Kostenschätzung berechnen", "Vorläufiger Preis. Die Werkstatt bestätigt das Angebot.", "Die Werkstatt berechnet den Preis.", "Das Bild konnte nicht hochgeladen werden. Prüfen Sie die Datei und versuchen Sie es erneut.",
    "Der Entwurf wurde in einem anderen Tab geändert. Laden Sie die gespeicherte Kopie.", "Änderungen in diesem Tab durch den gespeicherten Entwurf ersetzen?", "Gespeicherten Entwurf laden",
    "Dieses Motiv ist für den Auftrag nicht verfügbar.", "Speichern Sie den Entwurf und versuchen Sie es erneut.", "Die letzte Anfrage stimmt nicht überein. Prüfen Sie den Auftrag und versuchen Sie es erneut.",
  ],
  fr: [
    "Calendrier de production", "Période précédente", "Aujourd’hui", "Période suivante", "Date du calendrier", "Vue du calendrier", "Mois", "Semaine", "Jour", "Commandes actives uniquement", "Afficher plus de commandes",
    "À traiter", "Examiner la demande", "En attente de la réponse au devis", "Planifier la production", "En attente de la validation du visuel", "Suivre la production", "Préparer la remise", "Lire les nouveaux messages", "Étape suivante",
    "Devis acceptés des commandes terminées", "Choisir une couleur", "Ajouter une couleur", "Supplément de taille", "Tailles et codes couleur personnalisés", "Quitter sans enregistrer les modifications du produit ?", "Changer de produit efface les visuels de cet article. Continuer ?",
    "Calculer l’estimation", "Prix indicatif. L’atelier confirmera le devis.", "L’atelier calculera le prix.", "Impossible d’importer l’image. Vérifiez le fichier et réessayez.",
    "Le brouillon a changé dans un autre onglet. Chargez la copie enregistrée avant l’envoi.", "Remplacer les modifications de cet onglet par le brouillon enregistré ?", "Charger le brouillon enregistré",
    "Ce visuel est indisponible pour cette commande.", "Enregistrez le brouillon et réessayez.", "La demande précédente diffère de celle-ci. Vérifiez la commande et réessayez.",
  ],
};

export default Object.fromEntries(Object.entries(labels).map(([lang, words]) => [
  lang, Object.fromEntries(keys.map((key, index) => [key, words[index]])),
]));
