import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  I18nManager,
} from "react-native";

const CITY = {
  name: "زليتن، ليبيا",
  latitude: 32.4674,
  longitude: 14.5687,
};

const API = "https://api.alquran.cloud/v1";

const COLORS = {
  green: "#174C3A",
  darkGreen: "#103629",
  gold: "#E6C76A",
  cream: "#F7F4EA",
  white: "#FFFFFF",
  text: "#20352C",
  muted: "#7B887F",
  border: "#E6E0D0",
  lightGreen: "#E7EFE8",
};

const PRAYER_NAMES = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

const AZKAR = [
  {
    title: "أذكار الصباح",
    items: [
      { text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1 },
      { text: "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.", count: 1 },
      { text: "رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.", count: 3 },
      { text: "سبحان الله وبحمده.", count: 100 },
      { text: "أستغفر الله وأتوب إليه.", count: 100 },
    ],
  },
  {
    title: "أذكار المساء",
    items: [
      { text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1 },
      { text: "اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.", count: 1 },
      { text: "رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.", count: 3 },
      { text: "سبحان الله وبحمده.", count: 100 },
      { text: "أستغفر الله وأتوب إليه.", count: 100 },
    ],
  },
  {
    title: "أذكار متنوعة",
    items: [
      { text: "سبحان الله", count: 33 },
      { text: "الحمد لله", count: 33 },
      { text: "الله أكبر", count: 34 },
      { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1 },
      { text: "اللهم صل وسلم على نبينا محمد.", count: 10 },
    ],
  },
];

const PAGES = [
  { id: "home", title: "الرئيسية", icon: "⌂" },
  { id: "quran", title: "القرآن", icon: "۞" },
  { id: "azkar", title: "الأذكار", icon: "◉" },
  { id: "tasbeeh", title: "السبحة", icon: "●" },
];

function parsePrayerTime(value, date = new Date()) {
  if (!value) return null;

  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const result = new Date(date);
  result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((number) => String(number).padStart(2, "0"))
    .join(":");
}

function formatDate(date) {
  return date.toLocaleDateString("ar-LY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getPrayerSchedule(prayers, now) {
  if (!prayers) return null;

  const keys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const schedule = [];

  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    keys.forEach((key) => {
      const time = parsePrayerTime(prayers[key], date);
      if (time) {
        schedule.push({
          key,
          name: PRAYER_NAMES[key],
          time,
        });
      }
    });
  }

  schedule.sort((a, b) => a.time - b.time);

  const previous = [...schedule]
    .reverse()
    .find((item) => item.time <= now);

  const next = schedule.find((item) => item.time > now);

  return { previous, next };
}

export default function App() {
  const [page, setPage] = useState("home");
  const [now, setNow] = useState(new Date());

  const [prayers, setPrayers] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState("");

  const [surahs, setSurahs] = useState([]);
  const [surahLoading, setSurahLoading] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [ayahLoading, setAyahLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [azkarCategory, setAzkarCategory] = useState(0);
  const [azkarCounts, setAzkarCounts] = useState({});
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tasbeehText, setTasbeehText] = useState("سبحان الله");
  const [qibla, setQibla] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadPrayerTimes();
    loadSurahs();
    calculateQibla();
  }, []);

  async function loadPrayerTimes() {
    setPrayerLoading(true);
    setPrayerError("");

    try {
      const date = new Date();
      const dateString = [
        String(date.getDate()).padStart(2, "0"),
        String(date.getMonth() + 1).padStart(2, "0"),
        date.getFullYear(),
      ].join("-");

      const url =
        `https://api.aladhan.com/v1/timings/${dateString}` +
        `?latitude=${CITY.latitude}` +
        `&longitude=${CITY.longitude}&method=3`;

      const response = await fetch(url);
      const json = await response.json();

      if (!response.ok || json.code !== 200) {
        throw new Error("تعذر تحميل مواقيت الصلاة");
      }

      setPrayers(json.data.timings);
    } catch (error) {
      setPrayerError("تعذر تحميل المواقيت. تحقق من اتصال الإنترنت.");
    } finally {
      setPrayerLoading(false);
    }
  }

  async function loadSurahs() {
    setSurahLoading(true);

    try {
      const response = await fetch(`${API}/surah`);
      const json = await response.json();

      if (json.code === 200) {
        setSurahs(json.data);
      }
    } catch (error) {
      Alert.alert(
        "تنبيه",
        "تعذر تحميل قائمة السور. تحقق من اتصال الإنترنت."
      );
    } finally {
      setSurahLoading(false);
    }
  }

  async function openSurah(surah) {
    setSelectedSurah(surah);
    setAyahs([]);
    setPage("reading");
    setAyahLoading(true);

    try {
      const response = await fetch(`${API}/surah/${surah.number}`);
      const json = await response.json();

      if (json.code === 200) {
        setAyahs(json.data.ayahs);
      } else {
        Alert.alert("تنبيه", "تعذر تحميل السورة.");
      }
    } catch (error) {
      Alert.alert(
        "تعذر التحميل",
        "قراءة السورة تحتاج إلى اتصال بالإنترنت في هذه النسخة."
      );
    } finally {
      setAyahLoading(false);
    }
  }

  async function playSurah(surah) {
    try {
      const url =
        `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surah.number}.mp3`;

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("تنبيه", "تعذر فتح رابط الاستماع.");
    }
  }

  function calculateQibla() {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const toDegrees = (radians) => (radians * 180) / Math.PI;

    const lat1 = toRadians(CITY.latitude);
    const lat2 = toRadians(21.4225);
    const longitudeDifference = toRadians(
      39.8262 - CITY.longitude
    );

    const y = Math.sin(longitudeDifference);
    const x =
      Math.cos(lat1) * Math.tan(lat2) -
      Math.sin(lat1) * Math.cos(longitudeDifference);

    let angle = (toDegrees(Math.atan2(y, x)) + 360) % 360;

    setQibla(angle.toFixed(1));
  }

  const schedule = getPrayerSchedule(prayers, now);

  const filteredSurahs = surahs.filter((surah) =>
    `${surah.name} ${surah.englishName} ${surah.number}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function Header({ title, subtitle }) {
    return (
      <View style={styles.header}>
        <View style={styles.headerDecoration} />
        <Text style={styles.brand}>سِراج</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        )}
      </View>
    );
  }

  function PrayerCard() {
    return (
      <View style={styles.prayerCard}>
        <View style={styles.prayerTop}>
          <View>
            <Text style={styles.prayerTitle}>مواقيت الصلاة</Text>
            <Text style={styles.cityText}>⌖ {CITY.name}</Text>
          </View>
          <Text style={styles.prayerIcon}>☾</Text>
        </View>

        <Text style={styles.dateText}>{formatDate(now)}</Text>

        {prayerLoading && !prayers ? (
          <ActivityIndicator color={COLORS.gold} size="large" />
        ) : schedule?.next && schedule?.previous ? (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>
              باقي على صلاة {schedule.next.name}
            </Text>

            <Text style={styles.countdown}>
              {formatDuration(schedule.next.time - now)}
            </Text>

            <View style={styles.goldLine} />

            <Text style={styles.elapsedLabel}>
              مضى على صلاة {schedule.previous.name}
            </Text>

            <Text style={styles.elapsedTime}>
              {formatDuration(now - schedule.previous.time)}
            </Text>
          </View>
        ) : (
          <Text style={styles.cityText}>
            {prayerError || "جارٍ تجهيز المواقيت..."}
          </Text>
        )}

        <TouchableOpacity
          style={styles.goldButton}
          onPress={() => setPage("prayer")}
        >
          <Text style={styles.goldButtonText}>
            عرض مواقيت الصلاة كاملة
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function HomeScreen() {
    const features = [
      { title: "القرآن الكريم", subtitle: "اقرأ وتدبر", icon: "۞", page: "quran" },
      { title: "الأذكار", subtitle: "حصّن يومك", icon: "◉", page: "azkar" },
      { title: "السبحة", subtitle: "سبّح واستغفر", icon: "●", page: "tasbeeh" },
      { title: "القبلة", subtitle: "اتجاه الكعبة", icon: "⌖", page: "qibla" },
      { title: "مواقيت الصلاة", subtitle: "أوقات الصلاة", icon: "☾", page: "prayer" },
      { title: "استماع القرآن", subtitle: "بصوت مشاري العفاسي", icon: "♫", page: "listen" },
    ];

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.homeContent}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="رفيقك إلى الطمأنينة"
          subtitle="اجعل لروحك نصيبًا من النور كل يوم"
        />

        <PrayerCard />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>أقسام سِراج</Text>
          <Text style={styles.sectionSubtitle}>اختر ما تحتاج إليه</Text>
        </View>

        <View style={styles.featureGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.page}
              style={styles.featureCard}
              onPress={() => setPage(feature.page)}
              activeOpacity={0.8}
            >
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>❝</Text>
          <Text style={styles.quoteText}>
            أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
          </Text>
          <Text style={styles.quoteReference}>سورة الرعد • ٢٨</Text>
        </View>
      </ScrollView>
    );
  }

  function QuranScreen() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="القرآن الكريم" subtitle="كلام الله نور القلوب" />

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن سورة..."
          placeholderTextColor={COLORS.muted}
          textAlign="right"
        />

        {surahLoading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.green}
            style={styles.loader}
          />
        ) : (
          filteredSurahs.map((surah) => (
            <TouchableOpacity
              key={surah.number}
              style={styles.surahCard}
              onPress={() => openSurah(surah)}
            >
              <View style={styles.surahNumber}>
                <Text style={styles.surahNumberText}>{surah.number}</Text>
              </View>

              <View style={styles.surahInfo}>
                <Text style={styles.surahName}>{surah.name}</Text>
                <Text style={styles.surahMeta}>
                  {surah.revelationType === "Meccan" ? "مكية" : "مدنية"}
                  {" • "}
                  {surah.numberOfAyahs} آية
                </Text>
              </View>

              <Text style={styles.surahArrow}>‹</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  function ReadingScreen() {
    return (
      <View style={styles.screen}>
        <View style={styles.readingHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setPage("quran")}
          >
            <Text style={styles.backButtonText}>رجوع ←</Text>
          </TouchableOpacity>

          <Text style={styles.readingTitle}>
            {selectedSurah?.name || "القرآن الكريم"}
          </Text>
          <Text style={styles.readingSubtitle}>
            بسم الله الرحمن الرحيم
          </Text>
        </View>

        {ayahLoading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.green}
            style={styles.loader}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.ayahContainer}>
            <Text style={styles.ayahText}>
              {ayahs.map((ayah) => `${ayah.text} ۞`).join(" ")}
            </Text>
          </ScrollView>
        )}

        {!!selectedSurah && (
          <TouchableOpacity
            style={styles.floatingAudio}
            onPress={() => playSurah(selectedSurah)}
          >
            <Text style={styles.floatingAudioText}>♫ استمع للسورة</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function PrayerScreen() {
    const keys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="مواقيت الصلاة" subtitle={CITY.name} />

        <View style={styles.simpleCard}>
          <Text style={styles.sectionTitle}>الصلاة نور</Text>
          <Text style={styles.dateTextDark}>{formatDate(now)}</Text>

          {prayerLoading && !prayers ? (
            <ActivityIndicator
              color={COLORS.green}
              size="large"
              style={styles.loader}
            />
          ) : (
            keys.map((key) => (
              <View style={styles.prayerRow} key={key}>
                <Text style={styles.prayerRowName}>
                  {PRAYER_NAMES[key]}
                </Text>
                <Text style={styles.prayerRowTime}>
                  {prayers?.[key] || "--:--"}
                </Text>
              </View>
            ))
          )}

          {!!prayerError && (
            <Text style={styles.errorText}>{prayerError}</Text>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={loadPrayerTimes}
          >
            <Text style={styles.primaryButtonText}>تحديث المواقيت</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            المواقيت تقديرية بحسب الموقع وطريقة الحساب المختارة.
          </Text>
        </View>
      </ScrollView>
    );
  }

  function AzkarScreen() {
    const category = AZKAR[azkarCategory];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="الأذكار" subtitle="ألا بذكر الله تطمئن القلوب" />

        <View style={styles.categoryRow}>
          {AZKAR.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.categoryButton,
                azkarCategory === index && styles.categoryButtonActive,
              ]}
              onPress={() => setAzkarCategory(index)}
            >
              <Text
                style={[
                  styles.categoryText,
                  azkarCategory === index && styles.categoryTextActive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {category.items.map((item, index) => {
          const key = `${azkarCategory}-${index}`;
          const count = azkarCounts[key] || 0;
          const done = count >= item.count;

          return (
            <View style={styles.zikrCard} key={key}>
              <Text style={styles.zikrText}>{item.text}</Text>
              <View style={styles.zikrFooter}>
                <Text style={styles.zikrCounter}>
                  {Math.min(count, item.count)} / {item.count}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.zikrButton,
                    done && styles.zikrButtonDone,
                  ]}
                  onPress={() =>
                    setAzkarCounts((previous) => ({
                      ...previous,
                      [key]: done ? 0 : count + 1,
                    }))
                  }
                >
                  <Text style={styles.zikrButtonText}>
                    {done ? "إعادة" : "تسبيح ✓"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  function TasbeehScreen() {
    const suggestions = [
      "سبحان الله",
      "الحمد لله",
      "الله أكبر",
      "أستغفر الله",
      "لا إله إلا الله",
      "اللهم صل وسلم على نبينا محمد",
    ];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="السبحة الإلكترونية" subtitle="اذكر الله بقلب حاضر" />

        <View style={styles.tasbeehCard}>
          <Text style={styles.tasbeehLabel}>الذكر الحالي</Text>
          <Text style={styles.tasbeehText}>{tasbeehText}</Text>

          <TouchableOpacity
            style={styles.tasbeehCircle}
            onPress={() => setTasbeehCount((count) => count + 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.tasbeehCount}>{tasbeehCount}</Text>
            <Text style={styles.tasbeehTap}>اضغط للتسبيح</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setTasbeehCount(0)}
          >
            <Text style={styles.resetText}>إعادة العداد ↻</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>اختر الذكر</Text>

        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            style={[
              styles.surahCard,
              tasbeehText === suggestion && styles.selectedZikr,
            ]}
            onPress={() => {
              setTasbeehText(suggestion);
              setTasbeehCount(0);
            }}
          >
            <Text style={styles.surahName}>{suggestion}</Text>
            <Text style={styles.surahArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function QiblaScreen() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="اتجاه القبلة" subtitle="استقبل قبلة بيت الله الحرام" />

        <View style={styles.simpleCard}>
          <Text style={styles.kaabaIcon}>🕋</Text>
          <Text style={styles.qiblaTitle}>اتجاه القبلة من {CITY.name}</Text>

          <View style={styles.compass}>
            <View style={styles.compassRing}>
              <Text style={[styles.compassDirection, styles.north]}>ش</Text>
              <Text style={[styles.compassDirection, styles.south]}>ج</Text>
              <Text style={[styles.compassDirection, styles.east]}>ق</Text>
              <Text style={[styles.compassDirection, styles.west]}>غ</Text>
              <View
                style={[
                  styles.compassNeedle,
                  { transform: [{ rotate: `${Number(qibla || 0)}deg` }] },
                ]}
              >
                <View style={styles.needleTop} />
                <View style={styles.needleBottom} />
              </View>
              <View style={styles.compassCenter} />
            </View>
          </View>

          <Text style={styles.qiblaAngle}>
            {qibla === null ? "--" : `${qibla}°`}
          </Text>

          <Text style={styles.note}>
            هذا اتجاه القبلة محسوب من إحداثيات زليتن، وليس من مستشعر البوصلة
            في هاتفك. تأكد من اتجاه الشمال عند استخدامه.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={calculateQibla}
          >
            <Text style={styles.primaryButtonText}>إعادة الحساب</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function ListenScreen() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Header title="استماع القرآن" subtitle="استمع وتدبر آيات الله" />

        <View style={styles.simpleCard}>
          <Text style={styles.listenIcon}>♫</Text>
          <Text style={styles.sectionTitle}>القرآن الكريم</Text>
          <Text style={styles.note}>
            اختر سورة لفتح مشغل الصوت عبر الإنترنت.
          </Text>
        </View>

        {surahs.map((surah) => (
          <TouchableOpacity
            key={surah.number}
            style={styles.surahCard}
            onPress={() => playSurah(surah)}
          >
            <View style={styles.surahNumber}>
              <Text style={styles.surahNumberText}>{surah.number}</Text>
            </View>
            <View style={styles.surahInfo}>
              <Text style={styles.surahName}>{surah.name}</Text>
              <Text style={styles.surahMeta}>
                {surah.numberOfAyahs} آية
              </Text>
            </View>
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function renderPage() {
    switch (page) {
      case "home":
        return HomeScreen();
      case "quran":
        return <QuranScreen />;
      case "reading":
        return <ReadingScreen />;
      case "prayer":
        return <PrayerScreen />;
      case "azkar":
        return <AzkarScreen />;
      case "tasbeeh":
        return <TasbeehScreen />;
      case "qibla":
        return <QiblaScreen />;
      case "listen":
        return <ListenScreen />;
      default:
        return <HomeScreen />;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.darkGreen}
      />

      {renderPage()}

      {page !== "reading" && (
        <View style={styles.bottomNav}>
          {PAGES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => setPage(item.id)}
            >
              <Text
                style={[
                  styles.navIcon,
                  page === item.id && styles.navActive,
                ]}
              >
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.navText,
                  page === item.id && styles.navActive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  content: {
    paddingBottom: 28,
  },

  homeContent: {
    paddingBottom: 24,
  },

  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  headerDecoration: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: "rgba(230,199,106,0.22)",
    top: -85,
    left: -35,
  },

  brand: {
    color: COLORS.gold,
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 15,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 8,
  },

  headerSubtitle: {
    color: "#E5E9E1",
    fontSize: 14,
    textAlign: "right",
    lineHeight: 24,
  },

  prayerCard: {
    backgroundColor: COLORS.green,
    marginHorizontal: 16,
    marginTop: -5,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },

  prayerTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },

  prayerTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "right",
  },

  cityText: {
    color: "#D9E3D9",
    fontSize: 13,
    textAlign: "right",
    marginTop: 6,
  },

  prayerIcon: {
    color: COLORS.gold,
    fontSize: 36,
  },

  dateText: {
    color: "#D9E3D9",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 5,
  },

  countdownBox: {
    alignItems: "center",
    paddingVertical: 12,
  },

  countdownLabel: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: "center",
  },

  countdown: {
    color: COLORS.gold,
    fontSize: 39,
    fontWeight: "bold",
    marginVertical: 8,
    fontVariant: ["tabular-nums"],
  },

  goldLine: {
    width: "65%",
    height: 1,
    backgroundColor: "rgba(230,199,106,0.45)",
    marginVertical: 10,
  },

  elapsedLabel: {
    color: "#E5E9E1",
    fontSize: 14,
    textAlign: "center",
  },

  elapsedTime: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 5,
    fontVariant: ["tabular-nums"],
  },

  goldButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
  },

  goldButtonText: {
    color: COLORS.darkGreen,
    fontWeight: "bold",
    fontSize: 15,
  },

  sectionHeading: {
    paddingHorizontal: 20,
    marginTop: 27,
    marginBottom: 15,
    alignItems: "flex-end",
  },

  sectionTitle: {
    color: COLORS.green,
    fontSize: 21,
    fontWeight: "bold",
    textAlign: "right",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 13,
    textAlign: "right",
  },

featureGrid: {
  flexDirection: "row-reverse",
  flexWrap: "wrap",
  paddingHorizontal: 12,
  justifyContent: "space-between",
},

featureCard: {
  width: "48%",
  marginBottom: 12,
  backgroundColor: "#FFFFFF",
  borderRadius: 19,
  paddingVertical: 18,
  paddingHorizontal: 8,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#E6E0D0",
  elevation: 1,
  minHeight: 130,
},

  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  featureIconText: {
    fontSize: 27,
    color: COLORS.green,
  },

  featureTitle: {
    color: COLORS.green,
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
  },

  featureSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },

  quoteCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#EAE6D7",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  quoteMark: {
    color: "#B49B50",
    fontSize: 32,
  },

  quoteText: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 35,
  },

  quoteReference: {
    color: COLORS.muted,
    marginTop: 9,
  },

  searchInput: {
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderColor: COLORS.border,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
  },

  loader: {
    marginTop: 35,
  },

  surahCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  surahNumber: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.lightGreen,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  surahNumberText: {
    color: COLORS.green,
    fontWeight: "bold",
  },

  surahInfo: {
    flex: 1,
    alignItems: "flex-end",
    marginRight: 12,
  },

  surahName: {
    color: COLORS.green,
    fontWeight: "bold",
    fontSize: 17,
    textAlign: "right",
  },

  surahMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },

  surahArrow: {
    color: COLORS.gold,
    fontSize: 28,
    marginLeft: 6,
  },

  readingHeader: {
    backgroundColor: COLORS.green,
    padding: 20,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },

  backButtonText: {
    color: COLORS.gold,
    fontSize: 15,
  },

  readingTitle: {
    color: COLORS.gold,
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 10,
  },

  readingSubtitle: {
    color: COLORS.white,
    fontSize: 17,
    marginTop: 12,
  },

  ayahContainer: {
    padding: 22,
    paddingBottom: 100,
  },

  ayahText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 52,
    textAlign: "center",
  },

  floatingAudio: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: COLORS.green,
    borderRadius: 18,
    paddingHorizontal: 25,
    paddingVertical: 14,
    elevation: 4,
  },

  floatingAudioText: {
    color: COLORS.gold,
    fontWeight: "bold",
    fontSize: 16,
  },

  simpleCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  dateTextDark: {
    color: COLORS.muted,
    textAlign: "right",
    marginTop: 8,
    marginBottom: 18,
  },

  prayerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  prayerRowName: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: "bold",
  },

  prayerRowTime: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "bold",
  },

  primaryButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },

  primaryButtonText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "bold",
  },

  note: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 15,
  },

  errorText: {
    color: "#A63D40",
    textAlign: "center",
    marginTop: 12,
  },

  categoryRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 15,
  },

  categoryButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    margin: 4,
  },

  categoryButtonActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },

  categoryText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "bold",
  },

  categoryTextActive: {
    color: COLORS.gold,
  },

  zikrCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 17,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  zikrText: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 32,
    textAlign: "right",
  },

  zikrFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },

  zikrCounter: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "bold",
  },

  zikrButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },

  zikrButtonDone: {
    backgroundColor: "#547D61",
  },

  zikrButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },

  tasbeehCard: {
    backgroundColor: COLORS.green,
    margin: 16,
    padding: 22,
    borderRadius: 25,
    alignItems: "center",
  },

  tasbeehLabel: {
    color: "#D9E3D9",
    fontSize: 14,
  },

  tasbeehText: {
    color: COLORS.gold,
    fontSize: 23,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },

  tasbeehCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 7,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 25,
  },

  tasbeehCount: {
    color: COLORS.white,
    fontSize: 55,
    fontWeight: "bold",
  },

  tasbeehTap: {
    color: COLORS.gold,
    fontSize: 14,
    marginTop: 5,
  },

  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  resetText: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: "bold",
  },

  selectedZikr: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },

  kaabaIcon: {
    fontSize: 55,
    textAlign: "center",
    marginBottom: 10,
  },

  qiblaTitle: {
    color: COLORS.green,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },

  compass: {
    alignItems: "center",
    marginVertical: 25,
  },

  compassRing: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 4,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  compassDirection: {
    position: "absolute",
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "bold",
  },

  north: {
    top: 12,
  },

  south: {
    bottom: 12,
  },

  east: {
    right: 15,
  },

  west: {
    left: 15,
  },

  compassNeedle: {
    position: "absolute",
    width: 6,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },

  needleTop: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 65,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#B6473E",
  },

  needleBottom: {
    position: "absolute",
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 65,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.green,
  },

  compassCenter: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: COLORS.green,
  },

  qiblaAngle: {
    color: COLORS.green,
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
  },

  listenIcon: {
    color: COLORS.gold,
    fontSize: 50,
    textAlign: "center",
    marginBottom: 10,
  },

  playIcon: {
    color: COLORS.green,
    fontSize: 18,
    marginLeft: 8,
  },

  bottomNav: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 9,
    paddingBottom: 7,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },

  navIcon: {
    color: COLORS.muted,
    fontSize: 23,
    marginBottom: 3,
  },

  navText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  navActive: {
    color: COLORS.green,
    fontWeight: "bold",
  },
});
