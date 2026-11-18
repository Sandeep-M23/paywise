import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  Bank as PhBank,
  BookOpenText as PhBookOpenText,
  Lightbulb as PhLightbulb,
  Percent as PhPercent,
  Funnel as PhFunnel,
  Briefcase as PhBriefcase,
  Buildings as PhBuildings,
  Calculator as PhCalculator,
  ChartBar as PhChartBar,
  ChartPie as PhChartPie,
  CheckCircle as PhCheckCircle,
  Info as PhInfo,
  WarningOctagon as PhWarningOctagon,
  ClockCounterClockwise as PhClockCounterClockwise,
  Code as PhCode,
  DownloadSimple as PhDownloadSimple,
  EyeSlash as PhEyeSlash,
  FileArrowUp as PhFileArrowUp,
  FileCsv as PhFileCsv,
  GearSix as PhGearSix,
  Globe as PhGlobe,
  HandHeart as PhHandHeart,
  Handshake as PhHandshake,
  List as PhList,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassMinus as PhMagnifyingGlassMinus,
  Megaphone as PhMegaphone,
  Monitor as PhMonitor,
  Moon as PhMoon,
  Package as PhPackage,
  Palette as PhPalette,
  PencilSimple as PhPencilSimple,
  Plus as PhPlus,
  Question as PhQuestion,
  Scales as PhScales,
  Sigma as PhSigma,
  SignOut as PhSignOut,
  SquaresFour as PhSquaresFour,
  Stack as PhStack,
  Sun as PhSun,
  Target as PhTarget,
  TrendUp as PhTrendUp,
  UploadSimple as PhUploadSimple,
  UserCheck as PhUserCheck,
  UserMinus as PhUserMinus,
  Users as PhUsers,
  UsersThree as PhUsersThree,
  Wallet as PhWallet,
  Warning as PhWarning,
} from "@phosphor-icons/react/dist/ssr";

/**
 * App icons: Phosphor's filled weight, exported under the names the code already
 * used (from lucide) so call sites read the same. Structural glyphs (chevrons,
 * arrows, check, close, spinners) stay lucide line icons: they have no filled form.
 * The /ssr entry renders in server and client components alike.
 */
export type AppIcon = ComponentType<IconProps>;

function filled(Base: AppIcon, name: string): AppIcon {
  const Icon = (props: IconProps) => <Base weight="fill" {...props} />;
  Icon.displayName = name;
  return Icon;
}

export const AlertTriangle = filled(PhWarning, "AlertTriangle");
export const BarChart3 = filled(PhChartBar, "BarChart3");
export const Briefcase = filled(PhBriefcase, "Briefcase");
export const Building2 = filled(PhBuildings, "Building2");
export const Calculator = filled(PhCalculator, "Calculator");
export const ChartPie = filled(PhChartPie, "ChartPie");
export const CheckCircle2 = filled(PhCheckCircle, "CheckCircle2");
export const CircleCheck = filled(PhCheckCircle, "CircleCheck");
export const CircleHelp = filled(PhQuestion, "CircleHelp");
export const Code2 = filled(PhCode, "Code2");
export const Download = filled(PhDownloadSimple, "Download");
export const EyeOff = filled(PhEyeSlash, "EyeOff");
export const FileText = filled(PhFileCsv, "FileText");
export const FileUp = filled(PhFileArrowUp, "FileUp");
export const Globe = filled(PhGlobe, "Globe");
export const Handshake = filled(PhHandshake, "Handshake");
export const HeartHandshake = filled(PhHandHeart, "HeartHandshake");
export const History = filled(PhClockCounterClockwise, "History");
export const Landmark = filled(PhBank, "Landmark");
export const Layers = filled(PhStack, "Layers");
export const LayoutDashboard = filled(PhSquaresFour, "LayoutDashboard");
export const LogOut = filled(PhSignOut, "LogOut");
export const Megaphone = filled(PhMegaphone, "Megaphone");
export const Menu = filled(PhList, "Menu");
export const Monitor = filled(PhMonitor, "Monitor");
export const Moon = filled(PhMoon, "Moon");
export const Package = filled(PhPackage, "Package");
export const Palette = filled(PhPalette, "Palette");
export const Pencil = filled(PhPencilSimple, "Pencil");
export const Plus = filled(PhPlus, "Plus");
export const Scale = filled(PhScales, "Scale");
export const Search = filled(PhMagnifyingGlass, "Search");
export const SearchX = filled(PhMagnifyingGlassMinus, "SearchX");
export const Settings2 = filled(PhGearSix, "Settings2");
export const Sigma = filled(PhSigma, "Sigma");
export const Sun = filled(PhSun, "Sun");
export const Target = filled(PhTarget, "Target");
export const TrendingUp = filled(PhTrendUp, "TrendingUp");
export const Upload = filled(PhUploadSimple, "Upload");
export const UserCheck = filled(PhUserCheck, "UserCheck");
export const UserX = filled(PhUserMinus, "UserX");
export const Users = filled(PhUsers, "Users");
export const UsersRound = filled(PhUsersThree, "UsersRound");
export const Wallet = filled(PhWallet, "Wallet");
export const CircleCheckIcon = filled(PhCheckCircle, "CircleCheckIcon");
export const BookOpen = filled(PhBookOpenText, "BookOpen");
export const Lightbulb = filled(PhLightbulb, "Lightbulb");
export const PercentIcon = filled(PhPercent, "PercentIcon");
export const Filter = filled(PhFunnel, "Filter");
export const InfoIcon = filled(PhInfo, "InfoIcon");
export const OctagonXIcon = filled(PhWarningOctagon, "OctagonXIcon");
export const TriangleAlertIcon = filled(PhWarning, "TriangleAlertIcon");
