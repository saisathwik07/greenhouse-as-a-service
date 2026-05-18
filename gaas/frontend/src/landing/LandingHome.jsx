/**
 * Port of webbsite-main/artifacts/smart-greenhouse/src/pages/Home.tsx
 * as plain JSX for the GAAS public route only.
 *
 * Respects CMS sectionVisibility — admin can hide any section without
 * deleting its content.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import LandingNavbar from "./LandingNavbar";
import LandingHero from "./LandingHero";
import LandingAbout from "./LandingAbout";
import LandingProblem from "./LandingProblem";
import LandingHow from "./LandingHow";
import LandingTechnology from "./LandingTechnology";
import LandingServices from "./LandingServices";
import LandingGallery from "./LandingGallery";
import LandingTeam from "./LandingTeam";
import LandingCropGrowth from "./LandingCropGrowth";
import LandingResults from "./LandingResults";
import LandingWhy from "./LandingWhy";
import LandingAchievements from "./LandingAchievements";
import LandingContact from "./LandingContact";
import { LANDING_IMG, GALLERY_IMAGES } from "./assetPaths";

export default function LandingHome() {
  const [vis, setVis] = useState(null); // null = loading, object = loaded

  useEffect(() => {
    axios
      .get(`${API_URL}/cms/content`)
      .then(({ data }) => {
        const sv = data?.sectionVisibility;
        if (sv && typeof sv === "object") {
          setVis(sv instanceof Map ? Object.fromEntries(sv) : sv);
        } else {
          setVis({}); // all visible by default
        }
      })
      .catch(() => setVis({})); // on error, show everything
  }, []);

  // While loading CMS, show all sections (prevents flash)
  const show = (key) => !vis || vis[key] !== false;

  return (
    <div className="min-h-screen bg-background font-display text-foreground">
      <LandingNavbar />
      <main>
        {show("hero") && <LandingHero backgroundImage={LANDING_IMG.greenhouseExterior} />}
        {show("about") && <LandingAbout signboardImage={LANDING_IMG.signboard} />}
        <LandingProblem />
        <LandingHow plantationImage={LANDING_IMG.plantation} plantingCloseImage={LANDING_IMG.plantingClose} />
        <LandingTechnology sensorImage={LANDING_IMG.iotSensor} />
        {show("services") && <LandingServices />}
        <LandingGallery images={GALLERY_IMAGES} />
        <LandingTeam
          teamGreenhouseImage={LANDING_IMG.teamGreenhouse}
          facultyDiscussImage={LANDING_IMG.facultyDiscuss}
        />
        <LandingCropGrowth
          plantingCloseImage={LANDING_IMG.plantingClose}
          plantingPairImage={LANDING_IMG.plantingPair}
          plantGrowthImage={LANDING_IMG.plantGrowth}
        />
        <LandingResults harvestImage={LANDING_IMG.tomatoHarvest} />
        <LandingWhy />
        {show("testimonials") && <LandingAchievements />}
        {show("contact") && <LandingContact />}
      </main>
    </div>
  );
}
