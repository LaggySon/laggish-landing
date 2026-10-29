// The resume: who, what, and the numbers, for the /resume page and the PDF.
// Every count is computed from the credits in resume-data.js, so the page and
// the PDF cannot disagree with the list.
import { egf, tranquility } from "./resume-data.js"

export const profile = {
  name: "Michael Richards",
  handle: "LaggySon",
  headline: "Esports broadcast operations manager and producer",
  links: [
    { label: "laggi.sh/resume", href: "https://laggi.sh/resume" },
    { label: "github.com/LaggySon", href: "https://github.com/LaggySon" },
  ],
}

export const orgs = [
  {
    id: "tranquility",
    name: "Tranquility Gaming",
    role: "Broadcast producer and in-game observer",
    // tranquility.gg is gone; the channel is where the work still lives
    url: "https://www.youtube.com/tranquilitygg",
    about: "Community Overwatch league with Discord, Harmony, Transcendence and Ascendant tiers, plus multi-game events",
    channel: "https://www.youtube.com/tranquilitygg",
    groups: tranquility,
    // Told by Michael: the league's last year (its final broadcasts were in December 2023)
    lead: {
      title: "Broadcast operations manager",
      from: "2023-01",
      to: "2023-12",
      points: [
        "Scheduled broadcast staff for the league's shows and events.",
        "Created the broadcast packages used on air.",
        "Created and developed the league's in-house web overlay tool.",
        "Ensured broadcast quality across the league's shows.",
      ],
    },
  },
  {
    id: "egf",
    name: "Electronic Gaming Federation (EGF)",
    role: "Broadcast producer, collegiate CS:GO",
    url: "https://www.egf.gg",
    about: "North American organizing body for Division I collegiate and high school esports",
    channel: "https://www.youtube.com/channel/UCSO32htVpc6ZObgIHUwSOPQ",
    groups: egf,
  },
]

export const creditsOf = (org) => org.groups.flatMap((g) => g.credits)
export const allCredits = () => orgs.flatMap(creditsOf)

const PRODUCING = new Set(["Producer", "Producer and observer", "Co-producer"])
const OBSERVING = new Set(["Observer", "Producer and observer", "Observer director"])

export const countWhere = (credits, roles) => credits.filter((c) => roles.has(c.role)).length
export const produced = (credits) => countWhere(credits, PRODUCING)
export const observed = (credits) => countWhere(credits, OBSERVING)
export const grandFinals = (credits) => credits.filter((c) => /grand finals?/i.test(c.title)).length

// "2021-03" to "2023-12" over a list of credits
export const spanOf = (credits) => {
  const months = credits.map((c) => c.month).sort()
  return { from: months[0], to: months.at(-1) }
}

export const summary = () => {
  const all = allCredits()
  const { from, to } = spanOf(all)
  return `Esports broadcast operations manager and producer. Ran broadcast operations for Tranquility Gaming in its final year: staff scheduling, broadcast packages, the in-house overlay tool and quality control. Credited on ${all.length} broadcasts from ${from.slice(0, 4)} to ${to.slice(0, 4)} for Tranquility Gaming and the Electronic Gaming Federation, from weekly league nights to grand finals, across ${games.slice(0, -1).join(", ")} and ${games.at(-1)}. Also builds web tools for live broadcasts and event staffing.`
}

// Each organization's positions, newest and most senior first. The credited
// role's dates and points come from the credits.
export const positionsOf = (org) => {
  const credited = { title: org.role, ...spanOf(creditsOf(org)), points: bullets(org), credited: true }
  return org.lead ? [org.lead, credited] : [credited]
}

// What each job was, in a few lines. Numbers come from the credits.
export const bullets = (org) => {
  const credits = creditsOf(org)
  if (org.id === "tranquility") {
    return [
      `Produced ${produced(credits)} of ${credits.length} credited broadcasts across league Seasons 6 to 11: weekly matches in four skill tiers, knockouts, all-star nights and charity event weeks.`,
      "Produced the Season 11 Playoffs Grand Finals (Discord and Ascendant tiers) and the Season 7 Harmony Grand Final; co-produced the Season 8 Discord and Season 9 Transcendence Grand Finals.",
      `In-game observer on ${observed(credits)} broadcasts, including the Season 8 Transcendence and Harmony Grand Finals, and was observer director for the Season 10 Transcendence Grand Final.`,
      "Produced cross-game events: Tranquility x VALORANT, the Tranquility Triathlon (League of Legends, Rocket League), NACC Overwatch, League of Legends Clash Cups, Teamfight Tactics tournaments and Apex Legends PUGs.",
      "Ran shows with rotating crews of casters, observers and replay operators.",
    ]
  }
  return [
    `Produced ${produced(credits)} EGFC CS:GO broadcasts of Division I college matches (Villanova, DePaul, Siena, Marquette, UConn and others) in EGFC Seasons 3 and 4.`,
    "Worked with casters VIKING, Los, Wearwolf, QDC and NerdsCorner.",
  ]
}

// The strongest work, shown first: hiring managers look at 5 to 8 credits, not 100
export const selected = [
  { month: "2023-12", org: "Tranquility Gaming", text: "Season 11 Playoffs Grand Final, Discord Tier", role: "Producer", vod: "_JVM-KH3N5U" },
  { month: "2023-12", org: "Tranquility Gaming", text: "Season 11 Playoffs Grand Final, Ascendant Tier", role: "Producer", vod: "4llkuPy9WHE" },
  { month: "2023-06", org: "Tranquility Gaming", text: "Season 10 Transcendence Grand Final", role: "Observer director", vod: "5xNw5ZKNrPg" },
  { month: "2023-03", approx: true, org: "EGF", text: "EGFC Season 4 CS:GO, UConn vs Montana", role: "Producer", vod: "grr_QyYlOhM" },
  { month: "2023-01", approx: true, org: "Tranquility Gaming", text: "Season 9 Transcendence Grand Final", role: "Co-producer", vod: "2XSepFKZ0jA" },
  { month: "2022-08", org: "Tranquility Gaming", text: "Tranquility x VALORANT Play-ins", role: "Producer", vod: "fKJSstPWWow" },
  { month: "2022-06", org: "Tranquility Gaming", text: "Season 8 Transcendence Grand Final", role: "Observer", vod: "H9USvHaRQhw" },
  { month: "2022-01", org: "Tranquility Gaming", text: "NACC Overwatch Semi Finals and Finals", role: "Producer", vod: "H06f8QWWgFQ" },
]

export const tools = [
  { name: "Scoreboardish", what: "Web-based overlay tool for esports broadcasts", stack: "TypeScript", href: "https://scoreboardish.vercel.app", source: "https://github.com/LaggySon/scoreboardish" },
  { name: "Showish", what: "Overlay tool for live broadcasts, in progress", stack: "Elixir, Phoenix", href: "https://showish.laggi.sh", source: "https://github.com/LaggySon/showish" },
  { name: "Staffer", what: "Manages and staffs events that rely on a changing pool of freelancers", stack: "Svelte", href: "https://staffer.laggi.sh", source: "https://github.com/LaggySon/Staffer" },
]

export const games = ["Overwatch", "CS:GO", "VALORANT", "League of Legends", "Rocket League", "Teamfight Tactics", "Apex Legends"]

export const skills = [
  { label: "Operations", value: "Staff scheduling, broadcast packages, quality control" },
  { label: "Production", value: "Live broadcast production, in-game observing, observer direction, league nights, grand finals, multi-game events" },
  { label: "Games", value: games.join(", ") },
  { label: "Tools", value: "Web overlays and scoreboards, event staffing software" },
  { label: "Code", value: "TypeScript, JavaScript, Svelte, Elixir, Phoenix" },
]

export const vodUrl = (id) => `https://youtu.be/${id}`
