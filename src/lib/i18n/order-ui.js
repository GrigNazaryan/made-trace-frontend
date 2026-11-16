const keys = [
  "common_back", "nav_language", "order_payment_missing", "ws_settings_payment_link_help",
  "design_section", "design_start_help", "design_split_all",
  "editor_front", "editor_back", "editor_undo", "editor_redo", "editor_fit",
  "editor_elements", "editor_title", "editor_add_text", "editor_upload", "editor_instruction",
  "editor_canvas", "editor_selected", "editor_select", "editor_text", "editor_font",
  "editor_size", "editor_color", "editor_replace", "editor_rotation", "editor_duplicate", "editor_edit_artwork",
];

const labels = {
  en: [
    "← Back", "Language", "The workshop has not provided a secure payment link. Ask the workshop for payment instructions.", "Enter the HTTPS link your customers should use to pay.",
    "Designs for this item", "Set the quantity below. To use different artwork for each unit, create the designs here, then edit each one.", "Create {count} designs",
    "Front", "Back", "↶ Undo", "↷ Redo", "Fit", "Add elements", "Create your design", "＋ Add text", "⇪ Upload image",
    "Drag to move. Use the corner handle to resize and the top handle to rotate. Keep artwork within the print guides.",
    "Design canvas", "Selected element", "Select an element on the canvas to edit it.", "Text", "Font", "Size", "Color", "Replace image", "Rotation", "Duplicate", "Edit artwork",
  ],
  ru: [
    "← Назад", "Язык", "Мастерская ещё не указала безопасную ссылку. Напишите ей в заказе, чтобы уточнить способ оплаты.", "Укажите HTTPS-ссылку, по которой покупатель сможет оплатить заказ.",
    "Дизайны для этого товара", "Укажите количество ниже. Если нужен отдельный макет на каждую единицу, создайте дизайны здесь и отредактируйте нужные строки.", "Создать дизайны: {count}",
    "Спереди", "Сзади", "↶ Отменить", "↷ Повторить", "Вписать", "Добавить элементы", "Создайте свой дизайн", "＋ Добавить текст", "⇪ Загрузить изображение",
    "Перетащите элемент. Угловой маркер меняет размер, верхний — поворот. Размещайте макет в границах печати.",
    "Поле дизайна", "Выбранный элемент", "Выберите элемент на макете, чтобы изменить его.", "Текст", "Шрифт", "Размер", "Цвет", "Заменить изображение", "Поворот", "Дублировать", "Изменить макет",
  ],
  hy: [
    "← Հետ", "Լեզու", "Արհեստանոցը դեռ չի տրամադրել վճարման անվտանգ հղում։ Վճարման եղանակը ճշտելու համար գրեք արհեստանոցին։", "Մուտքագրեք HTTPS հղումը, որով գնորդը կվճարի պատվերի համար։",
    "Այս ապրանքի դիզայնները", "Ստորև նշեք քանակը։ Եթե յուրաքանչյուր հատի համար առանձին դիզայն է պետք, ստեղծեք դրանք այստեղ և խմբագրեք անհրաժեշտ տողերը։", "Ստեղծել {count} դիզայն",
    "Առջևի կողմ", "Հետևի կողմ", "↶ Հետարկել", "↷ Կրկնել", "Տեղավորել", "Ավելացնել տարրեր", "Ստեղծեք ձեր դիզայնը", "＋ Ավելացնել տեքստ", "⇪ Վերբեռնել պատկեր",
    "Տեղափոխեք տարրը՝ քաշելով այն։ Անկյունային բռնակով փոխեք չափը, վերևի բռնակով՝ պտտեք։ Պահեք դիզայնը տպման սահմաններում։",
    "Դիզայնի աշխատանքային դաշտ", "Ընտրված տարր", "Խմբագրելու համար ընտրեք դիզայնի տարրը։", "Տեքստ", "Տառատեսակ", "Չափ", "Գույն", "Փոխարինել պատկերը", "Պտույտ", "Կրկնօրինակել", "Խմբագրել դիզայնը",
  ],
  de: [
    "← Zurück", "Sprache", "Die Werkstatt hat noch keinen sicheren Zahlungslink hinterlegt. Fragen Sie die Werkstatt nach den Zahlungsdetails.", "Geben Sie den HTTPS-Link für Kundenzahlungen ein.",
    "Designs für diesen Artikel", "Geben Sie unten die Menge an. Für ein eigenes Motiv pro Stück erstellen und bearbeiten Sie hier die Designs.", "{count} Designs erstellen",
    "Vorderseite", "Rückseite", "↶ Rückgängig", "↷ Wiederholen", "Einpassen", "Elemente hinzufügen", "Design erstellen", "＋ Text hinzufügen", "⇪ Bild hochladen",
    "Ziehen Sie das Element zum Verschieben. Ändern Sie an der Ecke die Größe und oben die Drehung. Bleiben Sie innerhalb des Druckbereichs.",
    "Designfläche", "Ausgewähltes Element", "Wählen Sie ein Element auf der Fläche aus, um es zu bearbeiten.", "Text", "Schriftart", "Größe", "Farbe", "Bild ersetzen", "Drehung", "Duplizieren", "Motiv bearbeiten",
  ],
  fr: [
    "← Retour", "Langue", "L’atelier n’a pas fourni de lien de paiement sécurisé. Contactez-le pour connaître les modalités de paiement.", "Saisissez le lien HTTPS que vos clients utiliseront pour payer.",
    "Designs pour cet article", "Indiquez la quantité ci-dessous. Pour un visuel différent par pièce, créez les designs ici puis modifiez chaque ligne.", "Créer {count} designs",
    "Devant", "Dos", "↶ Annuler", "↷ Rétablir", "Ajuster", "Ajouter des éléments", "Créez votre design", "＋ Ajouter du texte", "⇪ Importer une image",
    "Faites glisser l’élément pour le déplacer. Utilisez la poignée d’angle pour le redimensionner et celle du haut pour le faire pivoter. Restez dans la zone d’impression.",
    "Zone de création", "Élément sélectionné", "Sélectionnez un élément sur la zone de création pour le modifier.", "Texte", "Police", "Taille", "Couleur", "Remplacer l’image", "Rotation", "Dupliquer", "Modifier le visuel",
  ],
};

export default Object.fromEntries(Object.entries(labels).map(([lang, words]) => [
  lang, Object.fromEntries(keys.map((key, index) => [key, words[index]])),
]));
