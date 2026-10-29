$(function () {
  var payersData = [];
  var dataReady = false;

  if (typeof window.InsuranceSearchInput === "undefined") {
    window.InsuranceSearchInput = false;
  }

  var widgetSelectors = [
    ".home-filter_component",
    ".provider-filter_component",
    ".provider-filter_wrapper",
    ".provider-filter_input-group",
    ".provider-filter",
  ];

  function localSelector(selector) {
    return String(selector || "").replace(/#([A-Za-z0-9_-]+)/g, '[id="$1"]');
  }

  function findLocal($root, selector) {
    return $root.find(localSelector(selector));
  }

  var insurancePlanOptions = {
    "All Savers": {
      popular: [
        "Gold Choice",
        "Bronze Choice",
        "Silver Choice",
        "Bronze Choice HSA 6350",
        "Silver Compass",
        "Gold Choice 1500",
        "Bronze Choice 6350",
        "Silver Choice 3000",
      ],
      all: [
        "Bronze Choice",
        "Bronze Choice 6350",
        "Bronze Choice HSA 6350",
        "Bronze Compass",
        "Bronze Compass Balanced",
        "Bronze Compass Plus",
        "Bronze Navigate Plus",
        "Catastrophic Choice 6850",
        "Catastrophic Compass Plus",
        "Gold Choice",
        "Gold Choice 1500",
        "Gold Compass",
        "Gold Compass Balanced",
        "Gold Compass Plus",
        "Gold Navigate Plus",
        "Silver Choice",
        "Silver Choice 2500",
        "Silver Choice 3000",
        "Silver Choice 4400",
        "Silver Choice HSA 3650",
        "Silver Compass",
        "Silver Compass Balanced",
        "Silver Compass Plus",
        "Silver Navigate Plus",
      ],
    },
    "Blue Cross Blue Shield Companies": {
      popular: [
        "BlueCard PPO",
        "BlueCard PPO Basic",
        "Federal Employee Program - Basic Option",
        "Federal Employee Program - Standard Option",
        "Medicare Advantage PPO",
        "BlueCard Traditional (Indemnity)",
        "National HMO",
        "UT Connect",
      ],
      all: [
        "BlueCard PPO",
        "BlueCard PPO Basic",
        "BlueCard Traditional (Indemnity)",
        "Federal Employee Program - Basic Option",
        "Federal Employee Program - Standard Option",
        "Medicare Advantage PPO",
        "National HMO",
        "UT Connect",
      ],
    },
    Cigna: {
      popular: [
        "Open Access Plus",
        "Cigna PPO",
        "Choice Fund Open Access Plus",
        "Choice Fund PPO",
        "Cigna Open Access Plus In-Network",
        "Open Access Plan",
        "HMO",
        "Open Access (all deductible levels)",
      ],
      all: [
        "Achieve Medicare (HMO C-SNP)",
        "AL: TotalCare (HMO D-SNP)",
        "Alliance Medicare (HMO)",
        "AZ: Health Flex HMO",
        "Baycare Choice Share",
        "Behavioral Health",
        "Care Network",
        "CDHP by Progressive",
        "Choice Fund Open Access Plus",
        "Choice Fund Open Access Plus with CareLink",
        "Choice Fund PPO",
        "CIGNA HealthCare Mid-Atlantic, Inc.- HMO",
        "CIGNA HealthCare of Arizona, Inc. - Phoenix IPA",
        "CIGNA HealthCare of California- Southern California Open Access",
        "CIGNA HealthCare of California, Inc. - San Francisco",
        "CIGNA HealthCare of California, Inc. - So. CA",
        "CIGNA HealthCare of Colorado, Inc.",
        "CIGNA HealthCare of Colorado, inc. HMO Select",
        "CIGNA HealthCare of Florida, Inc. - Central Florida Select",
        "CIGNA HealthCare of Florida, Inc. - Orlando HMO",
        "CIGNA HealthCare of Florida, Inc. - South Florida HMO",
        "CIGNA HealthCare of Florida, Inc. - South Florida Select",
        "CIGNA HealthCare of Florida, Inc. - Tampa",
        "CIGNA HealthCare of Georgia HMO-HMO Seamless",
        "CIGNA HealthCare of Georgia NET-NET POS Seamless",
        "CIGNA HealthCare of Georgia, Inc.",
        "CIGNA HealthCare of Georgia, Inc. – Savannah",
        "CIGNA HealthCare of Illinois, Inc.",
        "CIGNA HealthCare of Illinois, Inc. - Chicago and Northwest Indiana",
        "CIGNA HealthCare of Kansas/Missouri",
        "CIGNA HealthCare of Louisiana, Inc. - Shreveport",
        "CIGNA HealthCare of Massachusetts, Inc.",
        "CIGNA HealthCare of NE Missouri",
        "CIGNA HealthCare of New York, Inc.- HMO",
        "CIGNA HealthCare of North Carolina NET-NET POS Seamless",
        "CIGNA HealthCare of North Carolina, Inc.",
        "CIGNA HealthCare of North Texas HMO-HMO POS Seamless",
        "CIGNA HealthCare of North Texas Net-Net POS Seamless",
        "CIGNA HealthCare of Ohio, Inc. - Central Ohio",
        "CIGNA HealthCare of Ohio, Inc. - Cincinnati",
        "CIGNA HealthCare of Ohio, Inc. - Cleveland",
        "CIGNA HealthCare of Pennsylvania - Philadelphia",
        "CIGNA HealthCare of South Texas HMO-POS Seamless",
        "CIGNA HealthCare of South Texas Net-Net POS Seamless",
        "CIGNA HealthCare of Tennessee, Inc. - Memphis (HMO)",
        "CIGNA HealthCare of Tennessee, Inc. - Memphis (POS)",
        "CIGNA HealthCare of Tennessee, Inc. - Nashville",
        "CIGNA HealthCare of Texas, Inc. - Austin",
        "CIGNA HealthCare of Texas, Inc. - Dallas Select",
        "CIGNA HealthCare of Texas, Inc. - El Paso",
        "CIGNA HealthCare of Texas, Inc. - Houston",
        "CIGNA HealthCare of Texas, Inc. - Lufkin",
        "CIGNA HealthCare of Texas, Inc. - North Texas",
        "CIGNA HealthCare of Texas, Inc. - San Antonio",
        "CIGNA HealthCare Seamless Network - Florida",
        "CIGNA HealthCare Seamless Network - Tennessee",
        "CIGNA HeathCare of Washington",
        "CIGNA Managed Care Network of Indiana",
        "CIGNA Managed Care Network of NV - Las Vegas",
        "CIGNA Managed Care Network of TN - Chattanooga",
        "CIGNA Managed Care Network of TN - Knoxville HMO/Network",
        "CIGNA Managed Care Network of West Virginia/SE Ohio",
        "CIGNA Managed Care Network of Wisconsin",
        "CO: Vantage Bronze",
        "CO: Vantage Gold",
        "CO: Vantage Silver",
        "Connect - EPO",
        "Connect 0-4 (HMO)",
        "Connect 100",
        "Connect 2500-2",
        "Connect 6400",
        "Connect 7000",
        "Connect Bronze",
        "Connect Flex Bronze",
        "Connect Flex Gold",
        "Connect Flex Silver",
        "Connect Gold",
        "Connect HSA Bronze",
        "Connect HSA Silver",
        "Connect Silver",
        "Connected Care California (CA)",
        "DC: TotalCare (HMO D-SNP)",
        "DE: TotalCare (HMO D-SNP)",
        "Delaware - True Choice Medicare PPO",
        "Employee Assistance Program (EAP)",
        "EPO",
        "Evernorth",
        "FocusIn Flex Gold",
        "FocusIn Flex Silver",
        "FocusIn HSA Bronze",
        "Fundamental Medicare (HMO)",
        "GA: TotalCare (HMO D-SNP)",
        "Global Plan",
        "Health Alliance Plan",
        "Health Savings",
        "Health Savings (all deductible levels)",
        "HealthCare of Connecticut, Inc- HMO",
        "HealthCare Of Maine, Inc -HMO",
        "HealthCare of Maryland Access HSA Bronze",
        "HealthCare of Maryland Access HSA Silver",
        "Healthcare of New Jersey - Northern NJ HMO",
        "HealthCare of Southern New Jersey,Inc, HMO",
        "HealthCare of Texas- Open Access POS",
        "High Deductible Plan F^ (Medicare Supplement)",
        "HMO",
        "HMO - Northern California Open Access",
        "HMO - Southern California Open Access",
        "HMO - Southern California Value",
        "HMO by Dow",
        "HMO by Walt Disney",
        "HMO Open Access",
        "IL: Connect - HMO",
        "IL: Connect Diabetes Care - HMO",
        "IL: Plus with Northwestern Medicine - HMO",
        "IL: Plus with Northwestern Medicine 1000 - HMO",
        "IL: Plus with Northwestern Medicine Diabetes Care - HMO",
        "Indemnity",
        "KelseyCare Network",
        "LocalPlus",
        "MD: TotalCare (HMO D-SNP)",
        "Medical by Amazon",
        "Medical Network Open Access Point of Service (POS)",
        "Medical Network Point of Service (POS)",
        "Medicare Access",
        "Medicare Expand",
        "Medicare Surround",
        "Mid Atlantic Managed Care Network HMO/Network",
        "Missouri NET-NET POS Seamless",
        "MS: TotalCare (HMO D-SNP)",
        "My California Bronze",
        "My California Gold",
        "My California Platinum",
        "My California Silver",
        "My Copay Assure Silver",
        "My Health Flex 3000",
        "My Health Flex 5000",
        "My Health Savings 6000",
        "NC: Connect (with Duke Health and WakeMed) - HMO",
        "NC: Connect 3500 Diabetes Care (with Duke Health and WakeMed) - HMO",
        "Network Open Access",
        "One Health (Chicago, IL)",
        "Open Access (all deductible levels)",
        "Open Access Plan",
        "Open Access Plus",
        "Open Access Plus In-Network",
        "Open Access Plus PPO by AT&T",
        "Open Access Plus PPO by Cisco",
        "Open Access Plus PPO by Dow",
        "Open Access Plus PPO by Morgan Stanley",
        "Open Access Plus PPO by Nvidia",
        "Open Access Plus PPO by Walt Disney",
        "Open Access Plus/CareLink",
        "Open Access Value (all deductible levels)",
        "Open Access Value Plan",
        "Plan A (Medicare Supplement)",
        "Plan F (Medicare Supplement)",
        "Plan G (Medicare Supplement)",
        "Plan N (Medicare Supplement)",
        "POS Open Access",
        "PPO",
        "PPO by AT&T",
        "PPO by Dow",
        "PPO by JPMorgan Chase",
        "Preferred GA Medicare (HMO)",
        "Preferred Medicare (HMO)",
        "Preferred Plus Medicare (HMO)",
        "Preferred Savings Medicare (HMO)",
        "Premier Medicare (HMO-POS)",
        "Primary Medicare (HMO)",
        "Secure Rx (PDP)",
        "Secure-Essential Rx (PDP)",
        "Secure-Extra Rx (PDP)",
        "South Carolina - Courage Medicare HMO",
        "SureFit",
        "Texas - Preferred Full Savings Medicare HMO",
        "Traditions Medicare (HMO I-SNP)",
        "True Choice Access Medicare (PPO)",
        "True Choice Core Medicare",
        "True Choice Courage Medicare (PPO)",
        "True Choice Medicare (PPO)",
        "True Choice Plus Medicare (PPO)",
        "True Choice Savings Medicare (PPO)",
        "TX: Focus Network",
        "TX: TotalCare (HMO D-SNP)",
        "Vantage Flex",
        "Vision PPO",
        "Vision PPO by AT&T",
        "WellStar Employee Plan",
        "Workers' Compensation",
      ],
    },
    "Devoted Health": {
      popular: [
        "Devoted Health HMO",
        "Devoted Health HMO Prime",
        "Devoted Health Central Florida (HMO)",
        "Devoted Health Essentials Miami-Dade (HMO) Plan",
        "Devoted Health Miami-Dade (HMO)",
        "Devoted Health Prime Central Florida (HMO)",
        "Devoted Health Prime Miami-Dade (HMO) Plan",
        "Devoted Health Core Greater Tampa Bay (HMO) Plan",
      ],
      all: [
        "Central Florida (HMO)",
        "Core Greater Tampa Bay (HMO) Plan",
        "Essentials Miami-Dade (HMO) Plan",
        "HMO",
        "HMO Prime",
        "Miami-Dade (HMO)",
        "Prime Central Florida (HMO)",
        "Prime Miami-Dade (HMO) Plan",
      ],
    },
    Medicaid: {
      popular: [
        "New York Medicaid",
        "Texas STAR (Medicaid)",
        "Colorado - Health First Western and SouthWestern RAE 1 Medicaid",
        "Florida Medicaid",
        "Georgia Medicaid",
        "Michigan Medicaid",
        "Illinois Medicaid",
        "Maryland HealthChoice",
      ],
      all: [
        "Alabama",
        "Alaska",
        "Apple Health",
        "Arizona Health Care Cost Containment System (AHCCS)",
        "Arkansas",
        "BadgerCare Plus",
        "Colorado - Health First Central and SounthCentral RAE 3",
        "Colorado - Health First Denver Metro Area RAE 4",
        "Colorado - Health First Eastern and NorthEastern RAE 2",
        "Colorado - Health First Western and SouthWestern RAE 1",
        "Connecticut Husky Health",
        "DC",
        "Delaware",
        "Florida",
        "Georgia",
        "Healthy Louisiana",
        "HI: Med Quest",
        "Idaho",
        "Illinois",
        "Indiana",
        "Iowa",
        "KanCare Program",
        "Kentucky",
        "MaineCare",
        "Maryland HealthChoice",
        "MassHealth",
        "Medi-Cal",
        "Michigan",
        "Minnesota Medical Assistance",
        "Mississippi",
        "Missouri HealthNet",
        "Montana",
        "Nebraska",
        "Nevada",
        "New Hampshire",
        "New Jersey FamilyCare",
        "New Mexico",
        "New York",
        "North Carolina",
        "North Dakota",
        "Ohio",
        "OK: SoonerCare",
        "Oregon Health Plan",
        "Pennsylvania HealthChoices",
        "Rhode Island Medical Assistance",
        "SC: Healthy Connections",
        "South Dakota",
        "TennCare",
        "Texas STAR",
        "Utah",
        "Vermont",
        "Virginia Medallion",
        "West Virginia",
        "Wyoming",
      ],
    },
    "Medical Mutual of Ohio": {
      popular: [
        "SuperMed Plus (PPO)",
        "SuperMed Classic (PPO)",
        "MedMutual Advantage PPO",
        "OhioMed",
        "Personal Health Plan (PPO)",
        "SuperMed One (PPO)",
        "SuperMed Professional (PPO)",
        "HMO Health Ohio",
      ],
      all: [
        "4 Most",
        "CLE-Care (Network)",
        "Cofinity",
        "Devon Provider Network",
        "First Health",
        "HMO Health Ohio",
        "Market 1000",
        "Market 1750",
        "Market 2400",
        "Market 4000 HSA",
        "Market 6000 HSA",
        "Market HMO - Mercy Bronze",
        "Market HMO - Mercy Gold",
        "Market HMO - Mercy Silver",
        "Market HMO - ProMedica Bronze",
        "Market HMO - ProMedica Silver",
        "Medflex",
        "MedMutual Advantage HMO",
        "MedMutual Advantage PPO",
        "MedMutual HMO - NE Ohio",
        "Mercy HMO (Network)",
        "OhioHealth HMO (Network)",
        "OhioMed",
        "Personal Health Plan (PPO)",
        "PHCS",
        "PHCS Healthy Directions",
        "QualSight Lasik (South Carolina)",
        "SuperMed Classic (PPO)",
        "SuperMed HMO",
        "SuperMed One (PPO)",
        "SuperMed Plus (PPO)",
        "SuperMed POS",
        "SuperMed Preferred (POS)",
        "SuperMed Professional (PPO)",
        "Vision Service Plan",
      ],
    },
    Medicare: {
      popular: [
        "Original Medicare Part A and B",
        "Medicare Part C: Medicare Advantage PPO plan",
        "Medigap Plan",
        "Medicare Part C: Medicare Advantage HMO plan",
        "Medicare Part C: Medicare Advantage Fee-for-Service (PFFS) plan",
        "Medicare Part C: Medicare Advantage Special Needs Plan (SNP) plan",
        "Medicare Part C: Medicare Advantage MSA plan",
      ],
      all: [
        "Medigap Plan",
        "Original Part A and B",
        "Part C: Advantage Fee-for-Service (PFFS) plan",
        "Part C: Advantage HMO plan",
        "Part C: Advantage MSA plan",
        "Part C: Advantage PPO plan",
        "Part C: Advantage Special Needs Plan (SNP) plan",
      ],
    },
    Oxford: {
      popular: [
        "Freedom Plan PPO",
        "Liberty Plan",
        "Oxford EPO (Freedom Network/Liberty Network)",
        "Oxford EPO Non Gated (Freedom Network)",
        "Liberty Plan EPO",
        "Freedom Plan Metro",
        "Freedom Plan (POS)",
        "Oxford EPO (Metro Network)",
      ],
      all: [
        "Alternative Medicine",
        "Basic Indemnity",
        "Bronze Compass 3000",
        "Bronze Compass HSA 2500",
        "Bronze EPO HSA $3200 Gated - Metro",
        "Bronze EPO HSA $5000 Gated - Metro",
        "Bronze EPO HSA $5500 - Non-Gated - Freedom",
        "Bronze EPO HSA $6550 Gated - Metro",
        "Connecticut Blue Ribbon",
        "Copay Select EPO (Silver, Bronze)",
        "CT: HMO Laurel",
        "CT: HMO Laurel Select",
        "CT: Liberty HMO (Gated - Gold, Silver)",
        "CT: Liberty HMO HSA (Gated - Silver, Bronze)",
        "Freedom Plan (POS)",
        "Freedom Plan Access",
        "Freedom Plan Classic",
        "Freedom Plan Direct",
        "Freedom Plan HSA Direct",
        "Freedom Plan Laurel",
        "Freedom Plan Laurel Select",
        "Freedom Plan Metro",
        "Freedom Plan Metro Access",
        "Freedom Plan PPO",
        "Freedom Plan Select",
        "Freedom Plan Value Option",
        "Freedom Silver EPO",
        "Freedom/POS Active Plan (Motion Picture Industry)",
        "Gold Compass 1200",
        "Gold PPO - Non-Gated (Freedom Network)",
        "Healthy New York (HMO)",
        "HMO (Freedom Network)",
        "HMO (Liberty Network)",
        "HMO Select (Freedom Network)",
        "HMO Select (Liberty Network)",
        "Individual (NY/NJ)",
        "Individual Plan",
        "Liberty EPO HSA (Non-Gated - Bronze)",
        "Liberty Plan",
        "Liberty Plan Access",
        "Liberty Plan Classic",
        "Liberty Plan Direct",
        "Liberty Plan EPO",
        "Liberty Plan Metro",
        "Liberty Plan Metro Access",
        "Liberty Plan PPO",
        "Liberty Plan Select",
        "M Gold EPO 25/40 Non-Gated OHI CNT",
        "Medicare (Oxford Medicare Network)",
        "Navigate Oxford Plan",
        "NJ: Garden State EPO",
        "NJ: Garden State EPO HSA",
        "NJ: Garden State Gated EPO",
        "NJ: Garden State Primary Advantage",
        "NJ: Liberty EPO (Non-Gated - Silver)",
        "NJ: Metro EPO HSA (Non-Gated - Bronze)",
        "NY Ind Bronze HMO",
        "NY Ind HMO Gold",
        "NY Ind Platinum HMO",
        "NY Ind Silver HMO",
        "NY: Freedom EPO (Non-Gated - Silver, Platinum)",
        "NY: Freedom EPO 21 CNT (Non Gated - Gold, Silver, Platinum)",
        "NY: Freedom EPO HSA (Non-Gated - Bronze)",
        "NY: Freedom EPO HSA 21 CNT(Non Gated - Gold, Silver)",
        "NY: Freedom PPO 21 CNT (Non Gated - Gold, Silver, Platinum)",
        "NY: Freedom PPO HSA 21 CNT(Non Gated - Gold, Silver)",
        "NY: Liberty EPO (Non-Gated - Gold, Silver, Platinum)",
        "NY: Liberty EPO 21 CNT (Gated - Gold)",
        "NY: Liberty EPO 21 CNT (Non Gated - Silver, Platinum)",
        "NY: Liberty EPO HSA 21 CNT(Non Gated - Gold, Silver, Bronze)",
        "NY: Liberty Plan EPO (Gated - Gold, Silver, Platinum)",
        "NY: Liberty PPO HSA 21 CNT(Non Gated - Bronze)",
        "NY: Metro EPO (Gated - Gold, Silver, Platinum)",
        "NY: Metro EPO (Non-Gated - Gold)",
        "NY: Metro EPO 21 CNT (Gated - Silver)",
        "NY: Metro EPO 21 CNT (Non Gated - Silver, Platinum)",
        "NY: Metro EPO HSA (Gated - Silver, Bronze)",
        "NY: Metro EPO HSA (Non-Gated - Silver)",
        "NY: Metro EPO HSA 21 CNT (Gated - Silver, Bronze)",
        "Oxford Consumer",
        "Oxford Ease (Freedom Network)",
        "Oxford Ease (Liberty Network)",
        "Oxford EPO (Freedom Network/Liberty Network)",
        "Oxford EPO (Metro Network)",
        "Oxford EPO HSA (Freedom Network/ Liberty Network)",
        "Oxford EPO HSA (Metro Network)",
        "Oxford EPO Non Gated (Freedom Network)",
        "Oxford Exclusive Plan",
        "Oxford Exclusive Plan Metro",
        "Oxford Exclusive Plan Metro (Freedom Network) (EPO)",
        "Oxford Exclusive Plan Metro (Liberty Network) (EPO)",
        "Oxford Gated HMO Bronze",
        "Oxford Gated HMO Silver",
        "Oxford HSA Exclusive",
        "Oxford Medicare Advantage Balance",
        "Oxford Medicare Advantage Essential",
        "Oxford Medicare Advantage Select",
        "Oxford Medicare Advantage Signature",
        "Oxford Metro Network",
        "Oxford MyPlan",
        "Oxford NY Standard Plans (Liberty Network) (Exchange plans)",
        "Oxford PPO HSA (Freedom Network/Liberty Network)",
        "Oxford Standard Gated HMO Bronze",
        "Oxford Standard Gated HMO Platinum",
        "Oxford Standard Gated HMO Silver",
        "Oxford USA",
        "Platinum, Gold, Silver EPO - Non-Gated (Freedom Network)",
        "POS Flex (Freedom Network - Non-Gated)",
        "POS Flex (Liberty Network - Gated)",
        "POS Flex (Liberty Network - Non-Gated)",
        "Primary Advantage (Liberty Network)",
        "Select Plan EPO HSA (Liberty Network)",
        "Silver Compass 2450",
        "Silver EPO 30/60 Gated - Metro",
        "Standard Indemnity",
      ],
    },
    "United Healthcare": {
      popular: [
        "Choice Plus POS",
        "Choice EPO",
        "National Options Network PPO",
        "Choice Plus HMO",
        "Choice Plus Network UMR PPO",
        "Choice Plus PPO",
        "United Student Health Insurance Resources PPO",
        "Select Plus PPO",
      ],
      all: [
        "AARP Medicare Advantage Choice PPO",
        "AARP Medicare Advantage Choice Premier PPO",
        "AARP Medicare Advantage Essentials HMO POS",
        "AARP Medicare Advantage Focus HMO POS",
        "AARP Medicare Advantage HMO",
        "AARP Medicare Advantage HMO POS",
        "AARP Medicare Advantage Mosaic Choice PPO",
        "AARP Medicare Advantage Mosaic HMO",
        "AARP Medicare Advantage Patriot HMO POS",
        "AARP Medicare Advantage Patriot PPO",
        "AARP Medicare Advantage Plus HMO POS",
        "AARP Medicare Advantage PPO",
        "AARP Medicare Advantage Secure Horizons HMO",
        "AARP Medicare Advantage Secure Horizons HMO POS",
        "AARP Medicare Advantage Value Care HMO POS",
        "AARP Medicare Advantage Walgreens HMO POS",
        "AARP Medicare Advantage Walgreens PPO",
        "AARP Medicare Complete Access HMO",
        "AARP Medicare Complete Choice Essential PPO",
        "AARP Medicare Complete Choice PPO",
        "AARP Medicare Complete Essential HMO",
        "AARP Medicare Complete Focus Essential HMO",
        "AARP Medicare Complete HMO",
        "AARP Medicare Complete Premier HMO",
        "AARP Medicare Complete Secure Horizons Essential HMO",
        "AARP Medicare Complete Secure Horizons Focus HMO",
        "AARP Medicare Complete Secure Horizons Premier HMO",
        "AARP Medicare Complete Secure Horizons Value HMO",
        "AARP Medicare Preferred Prescription Drug Plan",
        "AARP Medicare Saver Prescription Drug Plan",
        "AARP Medicare Supplement",
        "AARP Personal Health Insurance Medicare Indemnity",
        "Advantage by Apple",
        "Advantage Gold HMO",
        "Advantage Plus Extra Gold HMO",
        "Advantage Plus Extra Silver HMO",
        "Advantage Plus Gold HMO",
        "Advantage Plus Silver HMO",
        "Advantage Silver EPO",
        "Advantage Silver HMO",
        "Advantage Silver Part D Medicare EPO",
        "All Savers",
        "Arizona - AARP Advantage Giveback Medicare PPO",
        "Assisted Living Plan Medicare SNP PPO",
        "California - Canopy Health Medicare Advantage HMO",
        "California - SignatureValue Advantage Value Network HMO",
        "California - SignatureValue Alliance HMO",
        "California - SignatureValue Flex Network HMO",
        "California - SignatureValue Harmony HMO",
        "California - SignatureValue HealthCare Partners Network HMO",
        "California - SignatureValue HMO",
        "California - SignatureValue Managed Care HMO",
        "California Schools VEBA Performance Network HMO",
        "Care Improvement Plus Medicare Advantage Regional PPO",
        "Caterpillar PPO",
        "Centura Value Plan",
        "Charter Balanced HMO",
        "Charter HMO",
        "Charter Plus HMO",
        "Choice Advanced PPO",
        "Choice Bronze EPO",
        "Choice EPO",
        "Choice Gold EPO",
        "Choice Platinum EPO",
        "Choice Plus Bronze POS",
        "Choice Plus Gold POS",
        "Choice Plus HMO",
        "Choice Plus Network UMR PPO",
        "Choice Plus Platinum POS",
        "Choice Plus POS",
        "Choice Plus PPO",
        "Choice Plus PPO by Cisco",
        "Choice Plus PPO by Morgan Stanley",
        "Choice Plus PPO by Performance Foods",
        "Choice Plus PPO by Valero",
        "Choice Plus Silver POS",
        "Choice Plus with Harvard Pilgrim PPO",
        "Choice PPO",
        "Choice Silver EPO",
        "Choice with Harvard Pilgrim PPO",
        "Colorado - Centura Health Doctors Plan",
        "Columbia University Choice Plus HMO",
        "Compass Balanced HMO",
        "Compass Bronze HMO",
        "Compass Gold HMO",
        "Compass HMO",
        "Compass Platinum HMO",
        "Compass Plus HMO",
        "Compass Rose Federal Employees Health Benefits Program FFS PPO",
        "Compass Silver HMO",
        "Complete Assure Medicare SNP PPO",
        "Complete Care Support Medicare SNP PPO",
        "Complete Medicaid Dual SNP HMO",
        "Complete Medicaid Dual SNP PPO",
        "Complete ONE Medicaid Dual SNP HMO",
        "Complete Select Medicaid Dual SNP HMO POS",
        "Core Essential HMO",
        "Core HMO",
        "Core POS",
        "Core PPO",
        "DC OCI Gold HMO",
        "DC OCI Platinum HMO",
        "DC OCI Silver HMO",
        "Definity Choice Plus POS",
        "Definity PPO",
        "Direct Access Neighborhood Health Partnership HMO",
        "Doctors EPO",
        "Doctors Plan Plus HMO",
        "EPO",
        "EPO by Oracle",
        "Erickson Advantage Champion Medicare SNP HMO POS",
        "Erickson Advantage Freedom Medicare HMO POS",
        "Erickson Advantage Guardian Medicare SNP HMO POS",
        "Erickson Advantage Liberty Medicare HMO POS",
        "Erickson Advantage Signature Medicare HMO POS",
        "Exclusive Provider Network PPO by Verizon",
        "Florida - Medica HealthCare MedicareMax HMO",
        "Florida - Preferred Choice Medicare HMO",
        "Florida - Preferred Complete Care Medicare HMO",
        "Florida - Preferred Special Care Medicare SNP HMO",
        "Focus Bronze EPO",
        "Focus Bronze HMO",
        "Focus Gold EPO",
        "Focus Gold HMO",
        "Focus Kelsey-SeyBold Bronze HMO",
        "Focus Kelsey-SeyBold Silver HMO",
        "Focus Silver EPO",
        "Focus Silver HMO",
        "Group Medicare Advantage HMO",
        "Group Medicare Advantage PPO",
        "Harvard Pilgrim Choice Plus POS",
        "Harvard Pilgrim Choice PPO",
        "Harvard Pilgrim Options PPO",
        "Hawai - Choice EPO by Oracle",
        "HDHP PPO by Nike",
        "Heritage Choice POS",
        "Heritage Choice Standard HMO",
        "Heritage Plus EPO",
        "Heritage Plus PPO",
        "Heritage Premier POS",
        "Heritage Select Advantage HDHP",
        "Heritage Select EPO",
        "Heritage Select POS",
        "High Deductible PPO by Verizon",
        "Hospital Protection Indemnity",
        "HSA PPO by Oracle",
        "Illinois - Complete Care Support Medicare SNP PPO",
        "Kelsey Seybold Focus Gold HMO",
        "Maine - Northern Light Health Medicare HMO POS",
        "Maryland - Complete Medicaid Dual SNP HMO POS",
        "Maryland - Independent Practice Association HMO",
        "Medica Choice with Choice Plus",
        "Medica Choice with Choice Plus POS",
        "Medicare Advantage Ally SNP HMO POS",
        "Medicare Advantage Assure HMO",
        "Medicare Advantage Assure PPO",
        "Medicare Advantage Choice Regional PPO",
        "Medicare Advantage Essential Regional PPO",
        "Medicare Advantage PPO",
        "Medicare Advantage PPO by Valero",
        "Medicare Complete Assure PPO",
        "Medicare Complete Choice PPO",
        "Medicare Direct Essential Indemnity",
        "Medicare Gold SNP PPO",
        "Medicare Select",
        "Medicare Silver SNP PPO",
        "Medium Choice Plus PPO by Oracle",
        "Michigan - Great Lakes Health Plan Medicaid HMO",
        "Minnesota - AARP Medicare Advantage Lakeshore PPO",
        "Minnesota - AARP Medicare Advantage Riverbank PPO",
        "Mount Sinai Top Tier Choice HMO",
        "Mount Sinai Top Tier Traditional HMO",
        "Mount Sinai UMR InNetwork Choice HMO",
        "Mount Sinai UMR InNetwork HMO",
        "Multi Choice POS",
        "National Options Network PPO",
        "Navigate Balanced HMO",
        "Navigate EPO",
        "Navigate HMO",
        "Navigate Plus HMO",
        "Navigate Plus PPO",
        "NavigateNOW Plan",
        "Neighborhood Health Partnership NHP Commercial HMO",
        "Neighborhood Health Partnership NHP Mercy Select HMO",
        "Neighborhood Health Partnership POS",
        "Network Copay by Pfizer",
        "Nevada - Northwell Health Employee Plan EPO",
        "New York - Advantage Medicaid Dual SNP HMO",
        "New York - Advantage Patriot Medicare PPO",
        "Nexus Accountable Care Organizations ACO",
        "Nexus Open Access ACO",
        "Nexus Referral Required Accountable Care Organizations ACO",
        "North Carolina - Group Medicare Advantage Base PPO",
        "North Carolina - Group Medicare Advantage Enhanced PPO",
        "North Shore Long Island Jewish Health System Plan",
        "Nursing Home Plan Medicare SNP HMO POS",
        "Nursing Home Plan Medicare SNP PPO",
        "NYSOH Essential HMO",
        "OCI Bronze HMO",
        "OCI HMO",
        "OCI Preferred POS",
        "Options Non Differential PPO",
        "Options with Harvard Pilgrim PPO",
        "Oxford Medicare EPO",
        "Passport Connect Choice EPO",
        "Passport Connect Choice Plus PPO",
        "Passport Connect Options PPO",
        "Plus PPO by Apple",
        "Plus PPO by Verizon",
        "PPO by Performance Foods",
        "Premium Choice Plus PPO by Oracle",
        "Proctor and Gamble PPO",
        "Protect Guard Choice Indemnity",
        "Protect Guard Preferred Indemnity",
        "Protect Guard Premier Indemnity",
        "Protect Guard Select Indemnity",
        "River Valley Choice Plus PPO",
        "Saver PPO by Apple",
        "Select Colorado ASO",
        "Select EPO",
        "Select HMO",
        "Select Plus Bronze PPO",
        "Select Plus Gold PPO",
        "Select Plus HMO",
        "Select Plus Platinum POS PPO",
        "Select Plus POS",
        "Select Plus PPO",
        "Select Plus Silver PPO",
        "Standard Bronze EPO",
        "Standard Bronze HMO",
        "Standard Gold EPO",
        "Standard Gold HMO",
        "Standard Silver EPO",
        "Standard Silver HMO",
        "Sync Medicare PPO",
        "Texas - Chronic Complete Medicare SNP HMO POS",
        "Texas - Complete Care Medicare SNP HMO POS",
        "Texas - HealthSelect POS",
        "Texas - HealthSelectsm Medicare Prescription Drug Plan",
        "The Villages Medicare Complete HMO",
        "The Villages Medicare Complete HMO POS",
        "Top Tier",
        "Traditional Coinsurance by Pfizer",
        "United Behavioral Health PPO",
        "United Student Health Insurance Resources PPO",
        "UnitedHealthOne PPO",
        "Value Bronze EPO",
        "Value Bronze HMO",
        "Value Gold EPO",
        "Value Gold HMO",
        "Value Silver EPO",
        "Value Silver HMO",
        "Veterans Affairs Community Care Network",
        "Virtual Bronze First HMO",
        "Virtual Gold First HMO",
        "Virtual Silver First HMO",
        "Vision PPO",
        "W500 Additional Network Benefit PPO",
        "W500 Emergent Wrap",
      ],
    },
    "United Medical Resources (UMR)": {
      popular: ["Choice Plus PPO", "PPO by American Airlines"],
      all: ["Choice Plus PPO", "PPO by American Airlines"],
    },
  };

  var disabledPlanNameCarriers = [
    "Cigna Local Plus",
    "Cigna Open Access Plus",
    "Community Health Network",
    "HealthSpring (Cigna Medicare)",
    "Independence Keystone Health",
    "UHC Medicare",
    "Wellmed",
    "Other",
  ];

  // Mirrors /api/payers?displayGroups=PRIMARY (Aetna excluded).
  var condensedInsuranceCarrierNames = [
    "Blue Cross Blue Shield Companies",
    "Cigna",
    "Community Health Network",
    "Medicare",
    "United Healthcare",
    "Other",
  ];

  function getSignupHost() {
    var apex = window.__nourish_apex;
    if (!apex) {
      var h = (window.location.hostname || "").toLowerCase();
      apex =
        h.indexOf("usenourish.com") !== -1
          ? "usenourish.com"
          : h.indexOf("nourish.com") !== -1
            ? "nourish.com"
            : "usenourish.com";
    }
    return "signup." + apex;
  }

  function getVariationParams(path) {
    path = (path || window.location.pathname || "/").toLowerCase();
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (path === "/") return { landingPageVariation: "Organic_Homepage" };
    if (
      path.indexOf("/home-b-no-wordmark") === 0 ||
      path.indexOf("/home-new") === 0
    )
      return { landingPageVariation: "landing-page" };
    if (path.indexOf("/blog") === 0) return { landingPageVariation: "blog" };
    if (path.indexOf("/landing-page") === 0)
      return { landingPageVariation: "landing-page" };
    if (path.indexOf("/conditions") === 0)
      return { landingPageVariation: "conditions" };
    if (path.indexOf("/local-dietitians") === 0)
      return { landingPageVariation: "local-dietitians" };
    if (path.indexOf("/paid-tt") === 0)
      return { landingPageVariation: "Paid_TT_Homepage" };
    if (path.indexOf("/paid-labs-b") === 0)
      return {
        landingPageVariation: "Labs_LP",
        variationName: "labsPromotionVariation",
      };
    if (path.indexOf("/paid-labs-a") === 0)
      return {
        landingPageVariation: "Paid_Homepage_A",
        variationName: "earlierContactInfoVariation",
      };
    if (path.indexOf("/paid") === 0)
      return { landingPageVariation: "Paid_Homepage" };
    if (path.indexOf("/does-my-insurance-cover-nutrition") === 0)
      return { landingPageVariation: "Am_I_Covered" };
    return null;
  }

  function getQueryParam(name) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  function normalizeValue(value) {
    if (value === null || typeof value === "undefined") return "";
    return String(value)
      .replace(/\u2019/g, "'")
      .trim()
      .toLowerCase();
  }

  var stateAbbreviationsByName = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "district of columbia": "DC",
  };

  function normalizeStateForSignup(value) {
    if (!value) return null;
    var trimmed = String(value).trim();
    if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
    return stateAbbreviationsByName[normalizeValue(trimmed)] || trimmed;
  }

  function isAetnaCarrierName(name) {
    var normalized = normalizeValue(name);
    if (!normalized) return false;
    // "Aetna", "Aetna Medicare", and any other Aetna-branded label.
    if (normalized.indexOf("aetna") !== -1) return true;
    // Meritain is billed as Aetna: groupNameDeprecated "Aetna", payerId 1.
    if (normalized === "meritain") return true;
    return false;
  }

  function isAetnaBackedPayer(payer) {
    if (!payer) return false;
    if (isAetnaCarrierName(payer.payerName)) return true;
    if (normalizeValue(payer.groupNameDeprecated) === "aetna") return true;
    if (String(payer.payerId) === "1") return true;
    return false;
  }

  function withoutAetnaPayers(list) {
    return (list || []).filter(function (payer) {
      return !isAetnaBackedPayer(payer);
    });
  }

  function fetchPayersData() {
    var cacheKey = "nourishHeroPayersData:displayGroups=PRIMARY";
    var cacheTTL = 24 * 60 * 60 * 1000;
    var now = Date.now();

    try {
      if (window.localStorage) {
        var cachedRaw = window.localStorage.getItem(cacheKey);
        if (cachedRaw) {
          var cached = JSON.parse(cachedRaw);
          if (
            cached &&
            typeof cached.timestamp === "number" &&
            Array.isArray(cached.data) &&
            now - cached.timestamp < cacheTTL
          ) {
            payersData = withoutAetnaPayers(cached.data);
            return Promise.resolve(payersData);
          }
        }
      }
    } catch (storageError) {
      // ignore storage issues
    }

    var url =
      "https://app." +
      window.__nourish_apex +
      "/api/payers?displayGroups=PRIMARY";

    return fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch payers data: " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        payersData = withoutAetnaPayers(Array.isArray(data) ? data : []);
        try {
          if (window.localStorage) {
            window.localStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), data: payersData }),
            );
          }
        } catch (writeError) {
          // ignore write errors
        }
        return payersData;
      })
      .catch(function () {
        payersData = withoutAetnaPayers(getFallbackPayersData());
        return payersData;
      });
  }

  // Snapshot of /api/payers?displayGroups=PRIMARY (Aetna excluded), used
  // when the API request fails.
  function getFallbackPayersData() {
    return [
      {
        id: 5,
        payerId: 5,
        payerName: "United Healthcare",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        healthieId: 2413,
        signUpFlowSortOrder: 1,
        displayGroup: "PRIMARY",
      },
      {
        id: 2,
        payerId: 2,
        payerName: "Blue Cross Blue Shield Companies",
        groupNameDeprecated: "Blue Cross Blue Shield",
        isOON: false,
        healthieId: 347,
        signUpFlowSortOrder: 2,
        displayGroup: "PRIMARY",
      },
      {
        id: 3,
        payerId: 3,
        payerName: "Cigna",
        groupNameDeprecated: "Cigna",
        isOON: false,
        healthieId: 528,
        signUpFlowSortOrder: 4,
        displayGroup: "PRIMARY",
      },
      {
        id: 6,
        payerId: 6,
        payerName: "Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        healthieId: 1552,
        signUpFlowSortOrder: 6,
        displayGroup: "PRIMARY",
      },
      {
        id: 334,
        payerId: 332,
        payerName: "Community Health Network",
        groupNameDeprecated: "Community Health Network",
        isOON: false,
        healthieId: 1143,
        signUpFlowSortOrder: 19,
        displayGroup: "PRIMARY",
      },
    ];
  }


  function findPayerId(payerName) {
    var target = normalizeValue(payerName);
    if (!target) return null;

    // Prefer exact payerName matches, then group/display with stable ordering.
    var bestMatchId = null;
    var bestRank = Infinity;
    var bestOrder = Infinity;

    for (var i = 0; i < payersData.length; i++) {
      var payer = payersData[i] || {};
      var payerId =
        typeof payer.id === "number" || typeof payer.id === "string"
          ? payer.id
          : null;
      if (payerId === null) continue;

      var payerNameNorm = normalizeValue(payer.payerName);
      var groupNameNorm = normalizeValue(payer.groupNameDeprecated);
      var displayGroupNorm = normalizeValue(payer.displayGroup);

      var rank = null;
      if (payerNameNorm && payerNameNorm === target) {
        rank = 1;
      } else if (groupNameNorm && groupNameNorm === target) {
        rank = 2;
      } else if (displayGroupNorm && displayGroupNorm === target) {
        rank = 3;
      }

      if (rank !== null) {
        var sortOrder =
          typeof payer.signUpFlowSortOrder === "number"
            ? payer.signUpFlowSortOrder
            : Number.MAX_SAFE_INTEGER;

        if (rank < bestRank || (rank === bestRank && sortOrder < bestOrder)) {
          bestRank = rank;
          bestOrder = sortOrder;
          bestMatchId = payerId;

          if (rank === 1) break;
        }
      }
    }

    return bestMatchId;
  }

  function appendUtmParams(params) {
    try {
      var utmKeys = window.NOURISH_UTM_PARAMS || [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "gclid",
        "fbclid",
        "msclkid",
        "ttclid",
        "oppref",
        "im_ref",
        "matchtype",
      ];

      var utmSnapshot = {};
      try {
        if (typeof window.NOURISH_GET_UTMS === "function") {
          utmSnapshot = window.NOURISH_GET_UTMS() || {};
        }
      } catch (utmError) {
        utmSnapshot = {};
      }

      var persistedUTMs = null;
      if (!utmSnapshot || !Object.keys(utmSnapshot).length) {
        try {
          var stored = sessionStorage.getItem("persistedUTMs");
          if (stored) {
            persistedUTMs = JSON.parse(stored);
          }
        } catch (storageError) {
          persistedUTMs = null;
        }
      }

      for (var i = 0; i < utmKeys.length; i++) {
        var key = utmKeys[i];
        var value = null;

        if (utmSnapshot && utmSnapshot[key]) {
          value = utmSnapshot[key];
        } else if (
          persistedUTMs &&
          persistedUTMs.params &&
          persistedUTMs.params[key]
        ) {
          value = persistedUTMs.params[key];
        }

        if (
          (!value || !String(value).trim()) &&
          typeof window !== "undefined" &&
          window.location &&
          window.location.search
        ) {
          try {
            var urlParams = new URLSearchParams(window.location.search);
            var raw = urlParams.get(key);
            if (raw && typeof raw === "string" && raw.trim()) {
              value = raw.trim();
            }
          } catch (queryError) {
            // ignore URL param resolution errors
          }
        }

        if (value && typeof value === "string" && value.trim()) {
          params.append(key, value.trim());
        }
      }
    } catch (e) {
      // ignore UTM resolution errors
    }
  }

  function truncateTextToWidth(text, $reference, maxWidth) {
    if (!text) return "";
    if (!maxWidth || maxWidth <= 0) return text;

    var ellipsis = "...";
    var $measure = $("<span>")
      .css({
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "nowrap",
      })
      .appendTo("body");

    if ($reference && $reference.length) {
      $measure.css({
        fontFamily: $reference.css("font-family"),
        fontSize: $reference.css("font-size"),
        fontWeight: $reference.css("font-weight"),
        letterSpacing: $reference.css("letter-spacing"),
        textTransform: $reference.css("text-transform"),
      });
    }

    var truncated = text;

    var fits = function (value) {
      $measure.text(value);
      return $measure.width() <= maxWidth;
    };

    if (fits(text)) {
      $measure.remove();
      return text;
    }

    while (truncated.length > 0 && !fits(truncated + ellipsis)) {
      truncated = truncated.slice(0, -1);
    }

    var result = truncated.length ? truncated + ellipsis : ellipsis;
    $measure.remove();
    return result;
  }

  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  }

  function formatDOBInput(value) {
    if (!value) return "";

    var digits = value.replace(/\D/g, "");
    if (!digits) return "";

    var monthStr = digits.substring(0, 2);
    var dayStr = digits.substring(2, 4);
    var yearStr = digits.substring(4, 8);

    function clamp(num, min, max) {
      return Math.max(min, Math.min(max, num));
    }

    if (monthStr.length === 2) {
      var mm = parseInt(monthStr, 10);
      if (Number.isNaN(mm)) mm = 1;
      mm = clamp(mm, 1, 12);
      monthStr = String(mm).padStart(2, "0");
    }

    if (dayStr.length === 2) {
      var dd = parseInt(dayStr, 10);
      if (Number.isNaN(dd)) dd = 1;
      dd = clamp(dd, 1, 31);
      dayStr = String(dd).padStart(2, "0");
    }

    if (yearStr.length === 4) {
      var yyyy = parseInt(yearStr, 10);
      var currentYear = new Date().getFullYear();
      var minYear = currentYear - 150;
      var maxYear = currentYear - 1;
      if (Number.isNaN(yyyy)) yyyy = minYear;
      yyyy = clamp(yyyy, minYear, maxYear);
      yearStr = String(yyyy);
    }

    if (monthStr.length === 2 && dayStr.length === 2 && yearStr.length === 4) {
      var mFull = parseInt(monthStr, 10);
      var yFull = parseInt(yearStr, 10);
      var maxDay = new Date(yFull, mFull, 0).getDate();
      var dFull = parseInt(dayStr, 10);
      dFull = clamp(dFull, 1, maxDay);
      dayStr = String(dFull).padStart(2, "0");
    }

    var out = monthStr;
    if (digits.length >= 2) out = monthStr + "/" + dayStr;
    if (digits.length >= 4) out = monthStr + "/" + dayStr + "/" + yearStr;
    return out;
  }

  function convertDOBForQuery(dobValue) {
    if (!dobValue || dobValue.length !== 10) return null;
    var match = dobValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      var month = match[1];
      var day = match[2];
      var year = match[3];
      return year + "-" + month + "-" + day;
    }
    return null;
  }

  function getAllWidgets() {
    var collected = [];
    var seen = new Set();
    var widgetSelector = widgetSelectors.join(",");

    for (var i = 0; i < widgetSelectors.length; i++) {
      var selector = widgetSelectors[i];
      $(selector).each(function () {
        var node = this;
        if (seen.has(node)) return;
        var hasCollectedAncestor = false;
        $(node)
          .parents(widgetSelector)
          .each(function () {
            if (seen.has(this)) {
              hasCollectedAncestor = true;
              return false;
            }
            return true;
          });
        if (hasCollectedAncestor) return;

        var $node = $(node);
        if (
          findLocal($node, "#home-filter-cta").length ||
          findLocal($node, "#provider-filter-cta").length ||
          findLocal($node, "#insurance_filter").length ||
          findLocal($node, "#insurance-condensed_filter").length ||
          findLocal($node, "#insurance_plan").length ||
          findLocal($node, "#specialty_filter").length ||
          findLocal($node, "#state_filter").length
        ) {
          seen.add(node);
          collected.push(node);
        }
      });
    }

    return $(collected);
  }

  function getWidgetState($widget) {
    var state = $widget.data("heroFilterState");
    if (!state) {
      state = {
        insurance: null,
        insurancePlan: null,
        state: null,
        specialties: [],
      };
      $widget.data("heroFilterState", state);
    }
    return state;
  }

  function getSelectedInsurance($widget) {
    var value = $widget
      .find('input[type="radio"][data-name="Insurance"]:checked')
      .val();
    return value || null;
  }

  function getSelectedInsurancePlan($widget) {
    var value = $widget
      .find('input[type="radio"][data-name="Insurance Plan"]:checked')
      .val();
    return value || null;
  }

  function getSelectedState($widget) {
    var value = $widget
      .find('input[type="radio"][data-name="States"]:checked')
      .val();
    return value || null;
  }

  function getSelectedSpecialties($widget) {
    var results = [];
    $widget
      .find('.filter-list_component input[type="checkbox"]:checked')
      .each(function () {
        var label = $(this).closest("label").text().trim();
        if (label) results.push(label);
      });
    return results;
  }

  function updateStateLabel($widget, value) {
    var $labels = $widget.find('[id="state-text"]');
    if (!$labels.length) return;

    $labels.each(function () {
      var $label = $(this);
      if (value) {
        $label.text(value);
        $label.css("color", "#191918");
        $label.attr("data-full-value", value);
      } else {
        $label.text("State");
        $label.css("color", "");
        $label.removeAttr("data-full-value");
      }
    });
  }

  function updateInsuranceLabel($widget, value) {
    var defaultText = "Insurance carrier";
    var display = value || defaultText;
    var $labels = $widget
      .find('[id="insurance-text"], [id="insurance-condensed-text"]')
      .filter(function () {
        return !$(this)
          .closest(".provider-filter_dopdown, .w-dropdown")
          .find('[id="insurance_plan"]').length;
      });
    if (!$labels.length) return;

    var $toggle = $widget
      .find(localSelector("#insurance-condensed_filter, #insurance_filter"))
      .first();
    var maxWidth = $toggle.length ? $toggle.width() : null;
    var $reference = $labels.first();
    var truncated =
      value && maxWidth
        ? truncateTextToWidth(display, $reference, maxWidth)
        : display;

    $labels.each(function () {
      var $label = $(this);
      $label.text(value ? truncated : defaultText);
      if (value) {
        $label.css("color", "#191918");
        $label.attr("data-full-value", value);
      } else {
        $label.css("color", "");
        $label.removeAttr("data-full-value");
      }
    });

    var $dropdownLabel = $widget
      .find(
        localSelector(
          "#insurance-condensed_filter .provider-filter_dropdown-label.filter, #insurance_filter .provider-filter_dropdown-label.filter",
        ),
      )
      .first();
    if ($dropdownLabel.length) {
      $dropdownLabel.text(value ? truncated : defaultText);
      if (value) {
        $dropdownLabel.css("color", "#191918");
      } else {
        $dropdownLabel.css("color", "");
      }
    }
  }

  function updateInsurancePlanLabel($widget, value) {
    var defaultText = "Insurance plan name";
    var display = value || defaultText;
    var $labels = $widget.find('[id="insurance-plan-text"]');
    if (!$labels.length) return;

    var $toggle = findLocal($widget, "#insurance_plan").first();
    var maxWidth = $toggle.length ? $toggle.width() : null;
    var $reference = $labels.first();
    var truncated =
      value && maxWidth
        ? truncateTextToWidth(display, $reference, maxWidth)
        : display;

    $labels.each(function () {
      var $label = $(this);
      $label.text(value ? truncated : defaultText);
      if (value) {
        $label.css("color", "#191918");
        $label.attr("data-full-value", value);
      } else {
        $label.css("color", "");
        $label.removeAttr("data-full-value");
      }
    });
  }

  function getDisabledPlanNameValue(carrierName) {
    var normalizedCarrier = normalizeValue(carrierName);
    if (!normalizedCarrier) return null;

    for (var i = 0; i < disabledPlanNameCarriers.length; i++) {
      if (normalizeValue(disabledPlanNameCarriers[i]) === normalizedCarrier) {
        return carrierName;
      }
    }

    return null;
  }

  function syncInsurancePlanForCarrier($widget, state) {
    var disabledPlanNameValue = getDisabledPlanNameValue(state.insurance);
    if (disabledPlanNameValue) {
      state.insurancePlan = disabledPlanNameValue;
      $widget
        .find('input[type="radio"][data-name="Insurance Plan"]')
        .prop("checked", false);
      return;
    }

    if (
      state.insurance &&
      !Object.prototype.hasOwnProperty.call(
        insurancePlanOptions,
        state.insurance,
      )
    ) {
      state.insurancePlan = null;
      $widget
        .find('input[type="radio"][data-name="Insurance Plan"]')
        .prop("checked", false);
    }
  }

  function updateInsurancePlanDisabledState($widget, carrierName) {
    var $planToggle = findLocal($widget, "#insurance_plan").first();
    if (!$planToggle.length) return;

    var hasPlanOptions =
      !!carrierName &&
      Object.prototype.hasOwnProperty.call(insurancePlanOptions, carrierName);
    var shouldDisable =
      findLocal($widget, "#insurance-condensed_filter").length > 0 &&
      !hasPlanOptions;

    $planToggle
      .toggleClass("disabled", shouldDisable)
      .attr("aria-disabled", shouldDisable ? "true" : "false");

    if (shouldDisable) {
      closeDropdownForElement($planToggle);
    }
  }

  function updateSpecialtyLabel($widget, values) {
    var defaultText = "Primary concern";
    var listText = Array.isArray(values) ? values.join(", ") : "";
    var $labels = findLocal($widget, "#concern-text");
    if ($labels.length) {
      var $toggle = findLocal($widget, "#specialty_filter").first();
      var maxWidth = $toggle.length ? $toggle.width() : null;
      var $reference = $labels.first();
      var truncated =
        listText && maxWidth
          ? truncateTextToWidth(listText, $reference, maxWidth)
          : listText;
      var displayText = truncated || defaultText;

      $labels.each(function () {
        var $label = $(this);
        $label.text(displayText);
        if (displayText !== defaultText) {
          $label.css("color", "#191918");
          $label.attr("data-full-value", listText);
        } else {
          $label.css("color", "");
          $label.removeAttr("data-full-value");
        }
      });
    }

    var countText = values && values.length ? "(" + values.length + ")" : "";
    $widget.find(".drop-label-total").each(function () {
      var $count = $(this);
      if (countText) {
        $count.text(countText).show();
      } else {
        $count.text("").hide();
      }
    });
  }

  function updateWidgetDisplay($widget) {
    var state = getWidgetState($widget);
    updateStateLabel($widget, state.state);
    updateInsuranceLabel($widget, state.insurance);
    updateInsurancePlanLabel($widget, state.insurancePlan);
    updateInsurancePlanDisabledState($widget, state.insurance);
    updateSpecialtyLabel($widget, state.specialties);
  }

  function findWidgetCTA($widget) {
    var $cta = findLocal($widget, "#home-filter-cta").first();
    if ($cta.length) return $cta;
    // Exclude the provider CTA — it keeps its /providers base and is
    // handled separately in updateWidgetCTA.
    return $widget
      .find('a[href*="' + getSignupHost() + '"]')
      .not("#provider-filter-cta")
      .first();
  }

  function getDropdownListContainer($widget, toggleSelector) {
    var $toggle = findLocal($widget, toggleSelector).first();
    if (!$toggle.length) return $();

    var $dropdown = $toggle.closest(".provider-filter_dopdown, .w-dropdown");
    if (!$dropdown.length) return $();

    return $dropdown
      .find(".filter-list_list-wrapper.filter-page.filter")
      .first();
  }

  function createOptionId(prefix, value, index) {
    var slug = String(value || "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) slug = "option";
    return prefix + "-" + slug + "-" + index;
  }

  function createRadioOption(options) {
    var label = document.createElement("label");
    label.className =
      "filter-list_radio-field w-radio" +
      (options.className ? " " + options.className : "");
    label.setAttribute("data-option-value", options.value);

    var radioDiv = document.createElement("div");
    radioDiv.className =
      "w-form-formradioinput w-form-formradioinput--inputType-custom radio-hide w-radio-input";

    var input = document.createElement("input");
    input.type = "radio";
    input.name = options.name;
    input.id = options.id;
    input.setAttribute("data-name", options.dataName);
    input.style.opacity = "0";
    input.style.position = "absolute";
    input.style.zIndex = "-1";
    input.value = options.value;

    var span = document.createElement("span");
    span.setAttribute("fs-cmsfilter-field", options.filterField);
    span.className = "filter-list_label state w-form-label";
    span.setAttribute("for", options.id);
    span.setAttribute("tabindex", "0");
    span.textContent = options.value;

    label.appendChild(radioDiv);
    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function createPlanSearchInput(carrierName) {
    var wrapper = document.createElement("div");
    wrapper.className = "insurance-plan-search";

    var input = document.createElement("input");
    input.type = "search";
    input.className = "insurance-plan-search-input input-search-input";
    input.placeholder = "Search for insurance plan";
    input.setAttribute("aria-label", "Search for insurance plan");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    if (carrierName) {
      input.setAttribute("data-carrier", carrierName);
    }

    wrapper.appendChild(input);
    return wrapper;
  }

  function createFilterDividerRow(extraClassName) {
    var row = document.createElement("div");
    row.className =
      "filter-list_radio-field filter-divider" +
      (extraClassName ? " " + extraClassName : "");

    var divider = document.createElement("div");
    divider.className = "filter-divider";

    row.appendChild(divider);
    return row;
  }

  function createPlanSectionLabel(text, modifierClass) {
    var row = document.createElement("div");
    row.className =
      "filter-list_section-label insurance-plan-section-label " + modifierClass;
    row.textContent = text;
    return row;
  }

  function createPlanNoResultsRow() {
    var row = document.createElement("div");
    row.className = "insurance-plan-no-results";
    row.style.display = "none";
    return row;
  }

  function appendHighlightedText(target, text, query) {
    target.textContent = "";
    if (!query) {
      target.textContent = text;
      return;
    }

    var normalizedText = text.toLowerCase();
    var normalizedQuery = query.toLowerCase();
    var start = normalizedText.indexOf(normalizedQuery);

    if (start === -1) {
      target.textContent = text;
      return;
    }

    var before = text.slice(0, start);
    var match = text.slice(start, start + query.length);
    var after = text.slice(start + query.length);

    if (before) target.appendChild(document.createTextNode(before));

    var highlight = document.createElement("span");
    highlight.className = "insurance-plan-search-highlight";
    highlight.style.color = "#f26533";
    highlight.textContent = match;
    target.appendChild(highlight);

    if (after) target.appendChild(document.createTextNode(after));
  }

  function filterInsurancePlanOptions($widget) {
    var $container = getDropdownListContainer($widget, "#insurance_plan");
    if (!$container.length) return;

    var query = String(
      $container.find(".insurance-plan-search-input").val() || "",
    )
      .trim()
      .toLowerCase();

    var hasVisiblePopularPlans = false;
    var hasVisibleAllPlans = false;

    $container.find(".dynamic-insurance-plan").each(function () {
      var option = this;
      var text = option.getAttribute("data-option-value") || "";
      var isPopular = option.classList.contains(
        "dynamic-insurance-plan--popular",
      );
      var isAll = option.classList.contains("dynamic-insurance-plan--all");
      var isMatch = !query || text.toLowerCase().indexOf(query) !== -1;
      option.style.display = isMatch ? "" : "none";
      if (isMatch && isPopular) hasVisiblePopularPlans = true;
      if (isMatch && isAll) hasVisibleAllPlans = true;

      var label = option.querySelector(".filter-list_label");
      if (label) {
        appendHighlightedText(label, text, query);
      }
    });

    $container
      .find(".insurance-plan-section-label--popular")
      .toggle(hasVisiblePopularPlans);
    $container
      .find(".insurance-plan-section-label--all")
      .toggle(hasVisibleAllPlans);
    $container
      .find(".insurance-plan-results-divider")
      .toggle(hasVisiblePopularPlans && hasVisibleAllPlans);

    var hasAnyVisiblePlans = hasVisiblePopularPlans || hasVisibleAllPlans;
    var $noResults = $container.find(".insurance-plan-no-results").first();
    if ($noResults.length) {
      $noResults
        .text(query ? 'Sorry no results found for "' + query + '"' : "")
        .toggle(Boolean(query) && !hasAnyVisiblePlans);
    }
  }

  function injectInsuranceOptions($widget) {
    if (!$widget || !$widget.length) return;

    var isCondensed =
      findLocal($widget, "#insurance-condensed_filter").length > 0;
    var $container = getDropdownListContainer(
      $widget,
      isCondensed ? "#insurance-condensed_filter" : "#insurance_filter",
    );
    if (!$container.length) return;
    if ($container.data("heroPayersInjected")) return;

    var $dividerRow = $container.find(".filter-divider").first();
    var $insertAfter = $dividerRow.closest(".filter-list_radio-field");

    if ($insertAfter.length) {
      $insertAfter.nextAll(".filter-list_radio-field").remove();
    } else {
      $container
        .find('input[type="radio"][data-name="Insurance"]')
        .closest(".filter-list_radio-field")
        .remove();
    }

    var fragment = document.createDocumentFragment();
    var carrierNames;

    if (isCondensed) {
      carrierNames = condensedInsuranceCarrierNames.filter(function (name) {
        return !isAetnaCarrierName(name);
      });
    } else {
      if (!payersData || !payersData.length) return;
      carrierNames = payersData
        .slice()
        .filter(function (payer) {
          return payer && payer.payerName && !isAetnaBackedPayer(payer);
        })
        .map(function (payer) {
          return payer.payerName;
        })
        .sort(function (a, b) {
          return a.localeCompare(b);
        });
    }

    carrierNames.forEach(function (payerName, index) {
      fragment.appendChild(
        createRadioOption({
          name: "Insurance",
          id: createOptionId("Insurance", payerName, index),
          dataName: "Insurance",
          filterField: "insurance",
          value: payerName,
          className: "dynamic-insurance",
        }),
      );
    });

    if (!isCondensed) {
      fragment.appendChild(
        createRadioOption({
          name: "Insurance",
          id: "Other",
          dataName: "Insurance",
          filterField: "insurance",
          value: "Other",
          className: "dynamic-insurance",
        }),
      );
    }

    if ($insertAfter && $insertAfter.length) {
      $insertAfter.after(fragment);
    } else {
      $container.append(fragment);
    }

    $container.data("heroPayersInjected", true);
  }

  function injectInsurancePlanOptions($widget, carrierName) {
    if (!$widget || !$widget.length) return;

    updateInsurancePlanDisabledState($widget, carrierName);

    var $container = getDropdownListContainer($widget, "#insurance_plan");
    if (!$container.length) return;

    var planGroups = carrierName ? insurancePlanOptions[carrierName] : null;
    var popularPlans =
      planGroups && Array.isArray(planGroups.popular) ? planGroups.popular : [];
    var allPlans =
      planGroups && Array.isArray(planGroups.all) ? planGroups.all : [];
    var currentCarrier = $container.data("heroPlanOptionsCarrier") || "";
    if (
      $container.data("heroPlanOptionsRendered") &&
      currentCarrier === (carrierName || "")
    ) {
      return;
    }

    var $mobileTitle = $container.find(".filter-list_mobile-title").first();
    if ($mobileTitle.length) {
      $mobileTitle.nextAll().remove();
    } else {
      $container.empty();
    }

    var fragment = document.createDocumentFragment();
    if (allPlans.length) {
      fragment.appendChild(createPlanSearchInput(carrierName));
      fragment.appendChild(createPlanNoResultsRow());
    }

    if (popularPlans.length) {
      fragment.appendChild(
        createPlanSectionLabel(
          "Popular plans",
          "insurance-plan-section-label--popular",
        ),
      );
    }

    popularPlans.forEach(function (planName, index) {
      fragment.appendChild(
        createRadioOption({
          name: "Insurance Plan",
          id: createOptionId("Insurance-Plan-Popular", planName, index),
          dataName: "Insurance Plan",
          filterField: "insurance-plan",
          value: planName,
          className: "dynamic-insurance-plan dynamic-insurance-plan--popular",
        }),
      );
    });

    if (popularPlans.length && allPlans.length) {
      fragment.appendChild(
        createFilterDividerRow("insurance-plan-results-divider"),
      );
    }

    if (allPlans.length) {
      fragment.appendChild(
        createPlanSectionLabel(
          "All plans",
          "insurance-plan-section-label--all",
        ),
      );
    }

    allPlans.forEach(function (planName, index) {
      fragment.appendChild(
        createRadioOption({
          name: "Insurance Plan",
          id: createOptionId("Insurance-Plan-All", planName, index),
          dataName: "Insurance Plan",
          filterField: "insurance-plan",
          value: planName,
          className: "dynamic-insurance-plan dynamic-insurance-plan--all",
        }),
      );
    });

    $container.append(fragment);
    $container.data("heroPlanOptionsCarrier", carrierName || "");
    $container.data("heroPlanOptionsRendered", true);
    filterInsurancePlanOptions($widget);
  }

  function getWidgetFormName($widget) {
    var $form = $widget.closest("form[data-name]").first();
    if (!$form.length) {
      $form = $widget.find("form[data-name]").first();
    }
    return $form.length ? $form.attr("data-name") : "";
  }

  function isValidLandingPageModuleType(value) {
    return (
      value === "CarrierPlanName" ||
      value === "Quiz" ||
      value === "NameDobForm" ||
      value === "FindADietitian"
    );
  }

  function getLandingPageModuleType($widget, isInsuranceCheck) {
    var $configured = $widget
      .closest("[data-landing-page-module-type]")
      .add($widget.find("[data-landing-page-module-type]").first())
      .first();
    var configured = $configured.attr("data-landing-page-module-type");
    if (isValidLandingPageModuleType(configured)) {
      return configured;
    }

    if (isInsuranceCheck) return "NameDobForm";
    if (findLocal($widget, "#insurance_plan").length) return "CarrierPlanName";

    var path = (window.location.pathname || "").toLowerCase();
    if (path.indexOf("/quiz-a") === 0) return "Quiz";

    return null;
  }

  function applyConfiguredLandingPageModuleType() {
    $('a[href*="' + getSignupHost() + '"]').each(function () {
      var link = this;
      var module = link.closest
        ? link.closest("[data-landing-page-module-type]")
        : null;
      if (!module) return;

      var moduleType = module.getAttribute("data-landing-page-module-type");
      if (!isValidLandingPageModuleType(moduleType)) return;

      var currentHref = link.getAttribute("href");
      if (!currentHref) return;

      try {
        var url = new URL(currentHref, window.location.origin);
        if (url.hostname.indexOf(getSignupHost()) === -1) return;
        if (!url.searchParams.has("landingPageModuleType")) {
          url.searchParams.set("landingPageModuleType", moduleType);
          link.setAttribute("href", url.toString());
        }
      } catch (e) {}
    });
  }

  function selectRadioByValue($widget, dataName, targetValue) {
    if (!targetValue) return false;

    var normalizedTarget = normalizeValue(targetValue);
    if (!normalizedTarget) return false;

    var matched = false;

    $widget
      .find('input[type="radio"][data-name="' + dataName + '"]')
      .each(function () {
        var input = this;
        var value = normalizeValue(input.value);
        if (value === normalizedTarget) {
          if (!input.checked) {
            input.checked = true;
            $(input).triggerHandler("change");
          }
          matched = true;
          return false;
        }
        return true;
      });

    return matched;
  }

  function closeDropdownForElement($element) {
    if (!$element || !$element.length) return;

    var $dropdownList = $element.closest(
      ".w-dropdown-list, .provider-filter_dropdown",
    );
    var $dropdown = $();
    if ($dropdownList.length) {
      $dropdown = $dropdownList.closest(".w-dropdown");
    }
    if (!$dropdown.length) {
      $dropdown = $element.closest(".provider-filter_dopdown, .w-dropdown");
    }
    if (!$dropdownList.length && $dropdown.length) {
      $dropdownList = $dropdown.find(".w-dropdown-list").first();
    }
    if (!$dropdown.length) return;

    var dropdownApi =
      window.Webflow &&
      window.Webflow.require &&
      window.Webflow.require("dropdown");

    if (dropdownApi) {
      try {
        dropdownApi.close($dropdown[0]);
      } catch (e) {
        // ignore dropdown API errors
      }
    }

    $dropdownList.removeClass("open w--open").slideUp(0);
    $dropdown
      .find(".provider-filter_dopdown-toggle, .w-dropdown-toggle")
      .attr("aria-expanded", "false")
      .removeClass("w--open");
  }

  function openInsurancePlanDropdown($widget, carrierName) {
    if (!$widget || !$widget.length) return;
    if (!findLocal($widget, "#insurance-condensed_filter").length) return;
    if (
      !Object.prototype.hasOwnProperty.call(insurancePlanOptions, carrierName)
    ) {
      return;
    }

    var $planToggle = findLocal($widget, "#insurance_plan").first();
    if (!$planToggle.length) {
      return;
    }
    $planToggle
      .removeClass("disabled")
      .attr("aria-disabled", "false")
      .closest(".provider-filter_dopdown, .w-dropdown")
      .removeClass("disabled")
      .attr("aria-disabled", "false");

    function openPlanDropdown() {
      var $dropdown = $planToggle.closest(".provider-filter_dopdown");
      if (!$dropdown.length) {
        $dropdown = $planToggle.closest(".w-dropdown");
      }
      var $list = $dropdown.find(".w-dropdown-list").first();
      var $listWrapper = $list.find(".filter-list_list-wrapper").first();
      var isOpen =
        $planToggle.attr("aria-expanded") === "true" &&
        $list.hasClass("w--open") &&
        $list.is(":visible") &&
        $listWrapper.is(":visible");

      if (
        $planToggle.hasClass("disabled") ||
        $planToggle.attr("aria-disabled") === "true" ||
        isOpen
      ) {
        return;
      }

      var dropdownApi =
        window.Webflow &&
        window.Webflow.require &&
        window.Webflow.require("dropdown");

      if (dropdownApi && typeof dropdownApi.open === "function") {
        try {
          dropdownApi.open($dropdown[0]);
        } catch (e) {
          // Fall back to manual class updates below.
        }
      }

      $planToggle.attr("aria-expanded", "true").addClass("w--open");
      if ($list.length) {
        $list.addClass("open w--open").stop(true, true).slideDown(0);
        $listWrapper.stop(true, true).css("display", "flex");
      }

      setTimeout(function () {
        $widget.find(".insurance-plan-search-input").first().focus();
      }, 0);
    }

    setTimeout(function () {
      openPlanDropdown();
      setTimeout(openPlanDropdown, 120);
    }, 80);
  }

  // Signup prefill that must stay out of the DOM. The values live in jQuery
  // data (not attributes); the CTA only carries yes/no flags, which global.js
  // reports as has_first_name / has_last_name / has_birthday / has_insurance.
  // planName travels with the carrier and has no flag of its own.
  var PRIVATE_PREFILL_FLAGS = {
    firstName: "data-prefill-first-name",
    lastName: "data-prefill-last-name",
    patientBirthday: "data-prefill-birthday",
    nourishPayerId: "data-prefill-insurance",
  };

  function setPrivatePrefill($cta, privateParams) {
    $cta.data("nourishPrivatePrefill", privateParams.toString());
    Object.keys(PRIVATE_PREFILL_FLAGS).forEach(function (key) {
      $cta.attr(PRIVATE_PREFILL_FLAGS[key], privateParams.has(key) ? "true" : "false");
    });
    bindPrivatePrefill($cta);
  }

  // Adds the private prefill only at navigation. Runs before the delegated
  // document handlers (global.js tracking, pixels), which therefore see the
  // clean href; navigation waits one tick so their href edits (variation,
  // https upgrade) are kept. Modified clicks open the clean href.
  function bindPrivatePrefill($cta) {
    if ($cta.data("nourishPrivatePrefillBound")) return;
    $cta.data("nourishPrivatePrefillBound", true);
    $cta.on("click", function (e) {
      var extra = $(this).data("nourishPrivatePrefill");
      if (!extra || e.isDefaultPrevented()) return;
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = this;
      e.preventDefault();
      setTimeout(function () {
        var url;
        try {
          url = new URL(link.href, window.location.origin);
        } catch (err) {
          return;
        }
        new URLSearchParams(extra).forEach(function (value, key) {
          url.searchParams.set(key, value);
        });
        if (link.target === "_blank") {
          window.open(url.toString(), "_blank", "noopener");
        } else {
          window.location.assign(url.toString());
        }
      }, 0);
    });
  }

  function updateWidgetCTA($widget) {
    if (!$widget || !$widget.length) return;

    var state = getWidgetState($widget);
    var selectedInsurance =
      state.insurance || getSelectedInsurance($widget) || null;
    var selectedInsurancePlan =
      state.insurancePlan || getSelectedInsurancePlan($widget) || null;
    var selectedState = state.state || getSelectedState($widget) || null;
    var formName = getWidgetFormName($widget);
    var isInsuranceCheck = formName === "Insurance Check";

    var baseUrl = "https://" + getSignupHost() + "/";
    var params = new URLSearchParams();

    var vp = getVariationParams(window.location.pathname);
    if (vp) {
      params.append("landingPageVariation", vp.landingPageVariation);
      if (vp.variationName) params.append("variationName", vp.variationName);
    }

    var landingPageModuleType = getLandingPageModuleType(
      $widget,
      isInsuranceCheck,
    );
    if (landingPageModuleType) {
      params.append("landingPageModuleType", landingPageModuleType);
    }

    // Insurance, name and DOB prefill never go on the href: analytics, ad
    // pixels and anything else reading links on the page would see them.
    // They are kept off-DOM and added only when the click navigates (see
    // bindPrivatePrefill).
    var privateParams = new URLSearchParams();

    if (selectedInsurance) {
      var normalized = normalizeValue(selectedInsurance);
      if (normalized === "i'm paying for myself") {
        privateParams.append("nourishPayerId", -1);
      } else if (normalized === "other") {
        privateParams.append("nourishPayerId", -2);
      } else if (normalized === "my insurance is not listed") {
        privateParams.append("nourishPayerId", -3);
      } else if (normalized === "i'll choose my insurance later") {
        // do not send nourishPayerId
      } else {
        var payerId = findPayerId(selectedInsurance);
        if (payerId) {
          privateParams.append("nourishPayerId", payerId);
        }
      }
    }

    if (selectedInsurancePlan) {
      privateParams.append("planName", selectedInsurancePlan);
    }

    if (selectedState) {
      params.append("state", normalizeStateForSignup(selectedState));
    }

    if (isInsuranceCheck) {
      window.InsuranceSearchInput = true;
      var firstName = findLocal($widget, "#first-name").val();
      if (firstName) {
        privateParams.append("firstName", firstName);
      }
      var lastName = findLocal($widget, "#last-name").val();
      if (lastName) {
        privateParams.append("lastName", lastName);
      }
      var dob = findLocal($widget, "#dob").val();
      if (dob && dob.length === 10) {
        var convertedDOB = convertDOBForQuery(dob);
        if (convertedDOB) {
          privateParams.append("patientBirthday", convertedDOB);
        }
      }
    } else {
      window.InsuranceSearchInput = false;
    }

    appendUtmParams(params);
    params.append("InsuranceSearchInput", isInsuranceCheck ? "true" : "false");

    // Params this widget computes. A stale value for one of these must not
    // survive on the href once the selection that produced it is cleared
    // (e.g. planName after switching away from a no-plan carrier).
    var widgetOwnedParams = [
      "landingPageVariation",
      "variationName",
      "landingPageModuleType",
      "nourishPayerId",
      "planName",
      "state",
      "firstName",
      "lastName",
      "patientBirthday",
      "InsuranceSearchInput",
    ];

    // Merge params over any params already on the CTA's href (existing ones
    // never win over freshly computed ones), then write the new href.
    function applyCtaHref($cta, ctaBaseUrl) {
      var merged = new URLSearchParams(params.toString());
      var currentHref = $cta.attr("href");
      if (currentHref && currentHref.indexOf(getSignupHost()) !== -1) {
        try {
          var existingUrl = new URL(currentHref, window.location.origin);
          existingUrl.searchParams.forEach(function (value, key) {
            if (widgetOwnedParams.indexOf(key) !== -1) return;
            if (!merged.has(key)) merged.set(key, value);
          });
        } catch (e) {}
      }
      $cta.attr("href", ctaBaseUrl + "?" + merged.toString());
      setPrivatePrefill($cta, privateParams);
    }

    var $cta = findWidgetCTA($widget);
    if ($cta && $cta.length) {
      applyCtaHref($cta, baseUrl);
    }

    // Provider CTA: same params as the main CTA, but signs up as a provider
    var $providerCta = findLocal($widget, "#provider-filter-cta").first();
    if ($providerCta.length) {
      applyCtaHref($providerCta, baseUrl + "providers");
    }

    $(
      'a[href*="' +
        getSignupHost() +
        '"]:not(#home-filter-cta):not(#provider-filter-cta)',
    ).each(
      function () {
        var $link = $(this);
        var currentHref = $link.attr("href");
        if (!currentHref) return;
        var url;
        try {
          url = new URL(currentHref, window.location.origin);
        } catch (e) {
          return;
        }
        url.searchParams.set("InsuranceSearchInput", "false");
        var module = this.closest
          ? this.closest("[data-landing-page-module-type]")
          : null;
        var moduleType =
          module && module.getAttribute("data-landing-page-module-type");
        if (
          isValidLandingPageModuleType(moduleType) &&
          !url.searchParams.has("landingPageModuleType")
        ) {
          url.searchParams.set("landingPageModuleType", moduleType);
        }
        $link.attr("href", url.toString());
      },
    );
  }

  function bindDobHandlers($widget) {
    var $dobInput = findLocal($widget, "#dob");
    if (!$dobInput.length || $dobInput.data("heroFilterDobBound")) return;
    $dobInput.data("heroFilterDobBound", true);

    if (isMobileDevice()) {
      $dobInput.attr({
        inputmode: "numeric",
        pattern: "[0-9]*",
        autocomplete: "bday",
      });
      $dobInput.addClass("mobile-dob-input");
    }

    $dobInput.on("input keydown", function (e) {
      var $input = $(this);
      var value = $input.val();
      var cursorPosition = $input[0].selectionStart;

      if (e.type === "keydown") {
        // A selected range (e.g. select-all) is replaced or deleted natively and
        // the input event reformats it; moving the caret here would collapse it.
        if ($input[0].selectionStart !== $input[0].selectionEnd) return;

        if (e.key === "Backspace") {
          if (isMobileDevice()) {
            e.preventDefault();

            var currentValue = $input.val();
            var cursorPos = $input[0].selectionStart;

            var newValue;
            if (cursorPos >= currentValue.length) {
              newValue = currentValue.slice(0, -1);
            } else {
              newValue =
                currentValue.slice(0, cursorPos - 1) +
                currentValue.slice(cursorPos);
            }

            if (
              currentValue.length > 0 &&
              currentValue[currentValue.length - 1] === "/"
            ) {
              var digitsOnly = newValue.replace(/\D/g, "");
              if (digitsOnly.length >= 2) {
                digitsOnly = digitsOnly.slice(0, -1);
                newValue = digitsOnly;
              }
            }

            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = formattedValue.length;
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
            return;
          }

          if (cursorPosition > 0 && value[cursorPosition - 1] === "/") {
            setTimeout(function () {
              var newValue =
                value.substring(0, cursorPosition - 2) +
                value.substring(cursorPosition);
              var formattedValue = formatDOBInput(newValue);
              $input.val(formattedValue);

              var newCursorPos = Math.max(0, cursorPosition - 2);
              $input[0].setSelectionRange(newCursorPos, newCursorPos);

              updateWidgetCTA($widget);
            }, 0);
            e.preventDefault();
            return;
          }

          setTimeout(function () {
            var newValue = $input.val();
            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = Math.min(cursorPosition, formattedValue.length);
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
          }, 0);
          return;
        } else if (e.key === "Delete") {
          setTimeout(function () {
            var newValue = $input.val();
            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = Math.min(cursorPosition, formattedValue.length);
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
          }, 0);
          return;
        }
        return;
      }

      var formattedValue = formatDOBInput(value);

      if (formattedValue !== value) {
        $input.val(formattedValue);
      }

      if (isMobileDevice()) {
        if (formattedValue !== value) {
          var newCursor = formattedValue.length;
          $input[0].setSelectionRange(newCursor, newCursor);
        }
      } else {
        var digitsOnly = formattedValue.replace(/\D/g, "");
        var newCursorPos;
        if (digitsOnly.length <= 2) {
          newCursorPos = digitsOnly.length;
        } else if (digitsOnly.length <= 4) {
          newCursorPos = digitsOnly.length + 1;
        } else {
          newCursorPos = digitsOnly.length + 2;
        }
        newCursorPos = Math.min(newCursorPos, formattedValue.length);
        $input[0].setSelectionRange(newCursorPos, newCursorPos);
      }

      updateWidgetCTA($widget);
    });
  }

  var DOB_PICKER_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  var dobPickerCount = 0;

  function injectDobPickerStyles() {
    if (document.getElementById("hero-filter-dob-picker-styles")) return;
    var caret =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23151514' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
    var style = document.createElement("style");
    style.id = "hero-filter-dob-picker-styles";
    style.textContent = [
      ".hf-dob-picker{position:absolute;z-index:999;width:304px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:16px;background:#fff;border:1px solid #e5dfd9;border-radius:16px;box-shadow:0 12px 32px rgba(21,21,20,.16);font-family:var(--_typography---font--primary-font,Circular,Verdana,sans-serif);font-size:14px;line-height:1.2;color:#151514;text-align:left}",
      ".hf-dob-picker[hidden]{display:none}",
      ".hf-dob-picker *{box-sizing:border-box}",
      ".hf-dob-picker__header{display:flex;align-items:center;gap:6px;margin-bottom:12px}",
      ".hf-dob-picker__nav{flex:none;width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;cursor:pointer}",
      ".hf-dob-picker__nav:hover:not(:disabled){background:#f5f2ef}",
      ".hf-dob-picker__nav:disabled{opacity:.3;cursor:default}",
      ".hf-dob-picker__selects{flex:1;display:flex;gap:6px;min-width:0}",
      ".hf-dob-picker__select{flex:1;min-width:0;height:32px;margin:0;padding:0 24px 0 10px;border:1px solid #e5dfd9;border-radius:8px;background:#fff " +
        caret +
        " no-repeat right 9px center;-webkit-appearance:none;appearance:none;font:inherit;font-size:16px;color:inherit;cursor:pointer}",
      ".hf-dob-picker__select--month{flex:1.4}",
      ".hf-dob-picker__weekdays,.hf-dob-picker__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}",
      ".hf-dob-picker__weekdays{margin-bottom:4px;font-size:12px;color:#a29d99;text-align:center}",
      ".hf-dob-picker__weekdays span{padding:4px 0}",
      ".hf-dob-picker__day{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:999px;background:transparent;font:inherit;color:inherit;cursor:pointer}",
      ".hf-dob-picker__day:hover{background:#f5f2ef}",
      '.hf-dob-picker__day[aria-pressed="true"]{background:#fe5000;color:#fff}',
      ".hf-dob-picker__nav:focus-visible,.hf-dob-picker__select:focus-visible,.hf-dob-picker__day:focus-visible{outline:2px solid #fe5000;outline-offset:1px}",
      ".hf-dob-anchor .provider-filter_field-icon{z-index:2;cursor:pointer}",
    ].join("");
    document.head.appendChild(style);
  }

  function parseDobValue(value) {
    var match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    var year = parseInt(match[3], 10);
    var month = parseInt(match[1], 10) - 1;
    var day = parseInt(match[2], 10);
    var date = new Date(year, month, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return { year: year, month: month, day: day };
  }

  function formatDobParts(year, month, day) {
    return (
      String(month + 1).padStart(2, "0") +
      "/" +
      String(day).padStart(2, "0") +
      "/" +
      year
    );
  }

  function bindDobPicker($widget) {
    var $input = findLocal($widget, "#dob").first();
    if (!$input.length || $input.data("heroFilterDobPickerBound")) return;
    $input.data("heroFilterDobPickerBound", true);

    injectDobPickerStyles();

    var input = $input[0];
    var anchor = $input.closest(".ms-input-wrap")[0] || input.parentNode;
    anchor.classList.add("hf-dob-anchor");
    var icon = anchor.querySelector(".provider-filter_field-icon");
    var touch = isMobileDevice();

    // Same year bounds formatDOBInput clamps typed values to.
    var currentYear = new Date().getFullYear();
    var maxYear = currentYear - 1;
    var minYear = currentYear - 120;

    var viewYear = currentYear - 30;
    var viewMonth = 0;
    var focusDay = 1;
    var isOpen = false;
    var suppressFocusOpen = false;

    var pickerId = "hero-dob-picker-" + ++dobPickerCount;
    var popover = document.createElement("div");
    popover.id = pickerId;
    popover.className = "hf-dob-picker";
    popover.hidden = true;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Choose date of birth");
    popover.innerHTML =
      '<div class="hf-dob-picker__header">' +
      '<button type="button" class="hf-dob-picker__nav" data-dob-nav="-1" aria-label="Previous month">' +
      '<svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><path d="M6.5 1 1.5 6l5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="hf-dob-picker__selects">' +
      '<select class="hf-dob-picker__select hf-dob-picker__select--month" aria-label="Month"></select>' +
      '<select class="hf-dob-picker__select hf-dob-picker__select--year" aria-label="Year"></select>' +
      "</div>" +
      '<button type="button" class="hf-dob-picker__nav" data-dob-nav="1" aria-label="Next month">' +
      '<svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="hf-dob-picker__weekdays" aria-hidden="true">' +
      "<span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>" +
      "</div>" +
      '<div class="hf-dob-picker__grid" role="group"></div>';

    var monthSelect = popover.querySelector(".hf-dob-picker__select--month");
    var yearSelect = popover.querySelector(".hf-dob-picker__select--year");
    var prevButton = popover.querySelector('[data-dob-nav="-1"]');
    var nextButton = popover.querySelector('[data-dob-nav="1"]');
    var grid = popover.querySelector(".hf-dob-picker__grid");

    DOB_PICKER_MONTHS.forEach(function (name, index) {
      monthSelect.appendChild(new Option(name, String(index)));
    });
    for (var y = maxYear; y >= minYear; y--) {
      yearSelect.appendChild(new Option(String(y), String(y)));
    }

    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", pickerId);
    if (icon) {
      icon.setAttribute("role", "button");
      icon.setAttribute("aria-label", "Open calendar");
    }

    function daysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    function setView(year, month, day) {
      viewYear = Math.max(minYear, Math.min(maxYear, year));
      viewMonth = month;
      focusDay = Math.min(day || 1, daysInMonth(viewYear, viewMonth));
    }

    function render() {
      monthSelect.value = String(viewMonth);
      yearSelect.value = String(viewYear);
      prevButton.disabled = viewYear === minYear && viewMonth === 0;
      nextButton.disabled = viewYear === maxYear && viewMonth === 11;
      grid.setAttribute(
        "aria-label",
        DOB_PICKER_MONTHS[viewMonth] + " " + viewYear,
      );

      var selected = parseDobValue(input.value);
      var leading = new Date(viewYear, viewMonth, 1).getDay();
      var total = daysInMonth(viewYear, viewMonth);
      var fragment = document.createDocumentFragment();

      for (var i = 0; i < leading; i++) {
        fragment.appendChild(document.createElement("span"));
      }
      for (var day = 1; day <= total; day++) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "hf-dob-picker__day";
        button.textContent = String(day);
        button.setAttribute("data-dob-day", String(day));
        button.setAttribute(
          "aria-label",
          DOB_PICKER_MONTHS[viewMonth] + " " + day + ", " + viewYear,
        );
        button.tabIndex = day === focusDay ? 0 : -1;
        if (
          selected &&
          selected.year === viewYear &&
          selected.month === viewMonth &&
          selected.day === day
        ) {
          button.setAttribute("aria-pressed", "true");
        }
        fragment.appendChild(button);
      }

      grid.innerHTML = "";
      grid.appendChild(fragment);
      position();
    }

    function focusActiveDay() {
      var button = grid.querySelector('[data-dob-day="' + focusDay + '"]');
      if (button) button.focus();
    }

    // Chosen once per open so the calendar doesn't flip sides while scrolling.
    var placeAbove = null;

    function position() {
      if (!isOpen || popover.hidden) return;
      var rect = anchor.getBoundingClientRect();
      var width = popover.offsetWidth;
      var height = popover.offsetHeight;
      var viewportWidth = document.documentElement.clientWidth;
      var viewportHeight = window.innerHeight;
      var gap = 8;

      var left = rect.left;
      left = Math.min(left, viewportWidth - width - gap);
      left = Math.max(gap, left);

      if (placeAbove === null) {
        placeAbove =
          rect.bottom + gap + height > viewportHeight &&
          rect.top - gap - height > 0;
      }
      var top = placeAbove ? rect.top - gap - height : rect.bottom + gap;

      popover.style.left = left + window.pageXOffset + "px";
      popover.style.top = top + window.pageYOffset + "px";
    }

    var positionFrame = null;
    function schedulePosition() {
      if (positionFrame) return;
      positionFrame = requestAnimationFrame(function () {
        positionFrame = null;
        position();
      });
    }

    function onDocumentPointerDown(event) {
      if (popover.contains(event.target) || anchor.contains(event.target)) {
        return;
      }
      close(false);
    }

    function open(focusGrid) {
      if (isOpen) {
        if (focusGrid) focusActiveDay();
        return;
      }

      var selected = parseDobValue(input.value);
      if (selected) {
        setView(selected.year, selected.month, selected.day);
      }

      if (!popover.parentNode) document.body.appendChild(popover);
      isOpen = true;
      render();
      popover.hidden = false;
      placeAbove = null;
      position();
      input.setAttribute("aria-expanded", "true");

      document.addEventListener("mousedown", onDocumentPointerDown, true);
      document.addEventListener("touchstart", onDocumentPointerDown, true);
      window.addEventListener("resize", schedulePosition);
      window.addEventListener("scroll", schedulePosition, true);

      if (focusGrid) focusActiveDay();
    }

    function close(returnFocus) {
      if (!isOpen) return;
      isOpen = false;
      popover.hidden = true;
      input.setAttribute("aria-expanded", "false");

      document.removeEventListener("mousedown", onDocumentPointerDown, true);
      document.removeEventListener("touchstart", onDocumentPointerDown, true);
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);

      if (returnFocus && !touch) {
        suppressFocusOpen = true;
        input.focus();
        suppressFocusOpen = false;
      }
    }

    function selectDay(day) {
      $input.val(formatDobParts(viewYear, viewMonth, day));
      $input.trigger("change");
      updateWidgetCTA($widget);
      close(true);
    }

    function moveFocus(deltaDays, deltaMonths) {
      var target = deltaMonths
        ? new Date(viewYear, viewMonth + deltaMonths, 1)
        : new Date(viewYear, viewMonth, focusDay + deltaDays);
      var targetDay = deltaMonths
        ? Math.min(
            focusDay,
            daysInMonth(target.getFullYear(), target.getMonth()),
          )
        : target.getDate();

      if (target.getFullYear() < minYear || target.getFullYear() > maxYear) {
        return;
      }

      setView(target.getFullYear(), target.getMonth(), targetDay);
      render();
      focusActiveDay();
    }

    popover.addEventListener("click", function (event) {
      var dayButton = event.target.closest("[data-dob-day]");
      if (dayButton) {
        selectDay(parseInt(dayButton.getAttribute("data-dob-day"), 10));
        return;
      }
      var navButton = event.target.closest("[data-dob-nav]");
      if (navButton && !navButton.disabled) {
        var target = new Date(
          viewYear,
          viewMonth + parseInt(navButton.getAttribute("data-dob-nav"), 10),
          1,
        );
        setView(target.getFullYear(), target.getMonth(), focusDay);
        render();
      }
    });

    monthSelect.addEventListener("change", function () {
      setView(viewYear, parseInt(monthSelect.value, 10), focusDay);
      render();
    });

    yearSelect.addEventListener("change", function () {
      setView(parseInt(yearSelect.value, 10), viewMonth, focusDay);
      render();
    });

    grid.addEventListener("keydown", function (event) {
      var keyMoves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [-7, 0],
        ArrowDown: [7, 0],
        PageUp: [0, -1],
        PageDown: [0, 1],
      };
      var move = keyMoves[event.key];
      if (!move) return;
      event.preventDefault();
      moveFocus(move[0], move[1]);
    });

    popover.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    });

    popover.addEventListener("focusout", function (event) {
      var next = event.relatedTarget;
      if (next && (popover.contains(next) || next === input)) return;
      if (next) close(false);
    });

    input.addEventListener("focus", function () {
      if (!touch && !suppressFocusOpen) open(false);
    });

    input.addEventListener("click", function () {
      if (!touch) open(false);
    });

    input.addEventListener("blur", function (event) {
      var next = event.relatedTarget;
      if (next && !popover.contains(next)) close(false);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        open(true);
      } else if ((event.key === "Escape" || event.key === "Enter") && isOpen) {
        event.preventDefault();
        close(false);
      } else if (event.key === "Tab" && isOpen && !event.shiftKey) {
        close(false);
      }
    });

    input.addEventListener("input", function () {
      if (!isOpen) return;
      var typed = parseDobValue(input.value);
      if (typed) setView(typed.year, typed.month, typed.day);
      render();
    });

    if (icon) {
      icon.addEventListener("click", function (event) {
        event.preventDefault();
        if (isOpen) {
          close(false);
          return;
        }
        if (touch) input.blur();
        open(touch);
      });
    }
  }

  function setupToggleA11y($toggle) {
    if (!$toggle || !$toggle.length || $toggle.data("heroFilterA11y")) return;
    $toggle.data("heroFilterA11y", true);

    var $dropdown = $toggle.closest(".provider-filter_dopdown");
    if (!$dropdown.length) {
      $dropdown = $toggle.closest(".w-dropdown");
    }
    if (!$dropdown.length) return;

    var $list = $dropdown.find(".w-dropdown-list").first();
    if (!$list.length) return;

    function getFocusableItems() {
      var $labels = $list.find(".filter-list_label.w-form-label");
      $labels.attr("tabindex", 0);
      return $labels.filter(":visible");
    }

    function openDropdown() {
      if ($toggle.attr("aria-expanded") !== "true") {
        $toggle.click();
      }
    }

    function closeDropdown(shouldFocusToggle) {
      if ($toggle.attr("aria-expanded") === "true") {
        $toggle.click();
      }
      if (shouldFocusToggle !== false) {
        $toggle.focus();
      }
    }

    function focusFirstItem() {
      var $searchInput = $list.find(".insurance-plan-search-input").first();
      if ($searchInput.length) {
        $searchInput.focus();
        return;
      }

      var $items = getFocusableItems();
      if ($items.length) {
        $items.eq(0).focus();
      }
    }

    function moveFocus(current, delta) {
      var $items = getFocusableItems();
      if ($items.length === 0) return;
      var idx = $items.index(current);
      if (idx === -1) {
        $items.eq(0).focus();
        return;
      }
      var nextIdx = (idx + delta + $items.length) % $items.length;
      $items.eq(nextIdx).focus();
    }

    $toggle.on("keydown", function (e) {
      var key = e.key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        openDropdown();
        setTimeout(focusFirstItem, 0);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
        setTimeout(focusFirstItem, 0);
      } else if (key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    });

    $list.on("keydown", ".filter-list_label.w-form-label", function (e) {
      var key = e.key;
      if (key === "ArrowDown") {
        e.preventDefault();
        moveFocus($(this), 1);
      } else if (key === "ArrowUp") {
        e.preventDefault();
        moveFocus($(this), -1);
      } else if (key === "Tab") {
        var $items = getFocusableItems();
        var idx = $items.index(this);
        if (e.shiftKey) {
          if (idx <= 0) {
            closeDropdown(false);
            return;
          }
          e.preventDefault();
          moveFocus($(this), -1);
        } else {
          if (idx >= $items.length - 1) {
            closeDropdown(false);
            return;
          }
          e.preventDefault();
          moveFocus($(this), 1);
        }
      } else if (key === "Home") {
        e.preventDefault();
        var $itemsHome = getFocusableItems();
        if ($itemsHome.length) $itemsHome.eq(0).focus();
      } else if (key === "End") {
        e.preventDefault();
        var $itemsEnd = getFocusableItems();
        if ($itemsEnd.length) $itemsEnd.eq($itemsEnd.length - 1).focus();
      } else if (key === "Enter" || key === " ") {
        e.preventDefault();
        $(this).click();
        var $radio = $(this).find('input[type="radio"]');
        if ($radio.length) {
          closeDropdown(true);
        }
      } else if (key === "Escape") {
        e.preventDefault();
        closeDropdown(true);
      }
    });

    $toggle.on("click", function () {
      setTimeout(function () {
        if ($toggle.attr("aria-expanded") === "true") {
          if (!$list.find(":focus").length) {
            focusFirstItem();
          }
        }
      }, 0);
    });
  }

  function setupDropdownA11y($widget) {
    var selectors = [
      "#insurance_filter",
      "#insurance-condensed_filter",
      "#insurance_plan",
      ".provider-filter_dopdown.specialty .provider-filter_dopdown-toggle",
      ".provider-filter_dopdown.specialty .w-dropdown-toggle",
      "#w-dropdown-toggle-0",
    ];

    for (var i = 0; i < selectors.length; i++) {
      findLocal($widget, selectors[i]).each(function () {
        setupToggleA11y($(this));
      });
    }
  }

  function applyPrefills($widget) {
    var state = getWidgetState($widget);

    if (
      typeof stateFilter !== "undefined" &&
      stateFilter !== null &&
      !state.state
    ) {
      if (!selectRadioByValue($widget, "States", stateFilter)) {
        state.state = stateFilter;
        updateStateLabel($widget, state.state);
      }
    }

    if (
      typeof insFilter !== "undefined" &&
      insFilter !== null &&
      !state.insurance
    ) {
      if (!selectRadioByValue($widget, "Insurance", insFilter)) {
        state.insurance = insFilter;
        updateInsuranceLabel($widget, state.insurance);
      }
      syncInsurancePlanForCarrier($widget, state);
      injectInsurancePlanOptions($widget, state.insurance);
    }

    var insuranceParam = getQueryParam("insurance");
    if (insuranceParam) {
      selectRadioByValue($widget, "Insurance", insuranceParam);
      state.insurance = getSelectedInsurance($widget) || state.insurance;
      syncInsurancePlanForCarrier($widget, state);
      injectInsurancePlanOptions($widget, state.insurance);
    }

    var insurancePlanParam =
      getQueryParam("insurancePlanName") ||
      getQueryParam("insurancePlan") ||
      getQueryParam("planName");
    if (insurancePlanParam && !getDisabledPlanNameValue(state.insurance)) {
      selectRadioByValue($widget, "Insurance Plan", insurancePlanParam);
      state.insurancePlan =
        getSelectedInsurancePlan($widget) || state.insurancePlan;
    }
  }

  function initWidget($widget) {
    if (!$widget || !$widget.length) return;
    if ($widget.data("heroFilterInitialized")) return;
    $widget.data("heroFilterInitialized", true);

    var state = getWidgetState($widget);
    state.insurance = state.insurance || getSelectedInsurance($widget);
    state.insurancePlan =
      state.insurancePlan || getSelectedInsurancePlan($widget);
    state.state = state.state || getSelectedState($widget);
    state.specialties = getSelectedSpecialties($widget);
    syncInsurancePlanForCarrier($widget, state);
    injectInsurancePlanOptions($widget, state.insurance);

    updateWidgetDisplay($widget);
    applyPrefills($widget);

    state.insurance = getSelectedInsurance($widget) || state.insurance;
    state.insurancePlan =
      getSelectedInsurancePlan($widget) || state.insurancePlan;
    state.state = getSelectedState($widget) || state.state;
    state.specialties = getSelectedSpecialties($widget);
    syncInsurancePlanForCarrier($widget, state);
    injectInsurancePlanOptions($widget, state.insurance);

    updateWidgetDisplay($widget);

    $widget.on("click", ".filter-list_label", function () {
      var $radio = $(this).siblings(".radio-hide");
      if ($radio.length) {
        $radio.trigger("click");
      }
    });

    $widget.on(
      "change",
      'input[type="radio"][data-name="States"]',
      function () {
        var value = $(this).val();
        state.state = value || null;
        updateStateLabel($widget, state.state);
        updateWidgetCTA($widget);
        closeDropdownForElement($(this));
      },
    );

    $widget.on(
      "change",
      'input[type="radio"][data-name="Insurance"]',
      function () {
        var value = $(this).val();
        state.insurance = value || null;
        state.insurancePlan = getDisabledPlanNameValue(state.insurance);
        $widget
          .find('input[type="radio"][data-name="Insurance Plan"]')
          .prop("checked", false);
        injectInsurancePlanOptions($widget, state.insurance);
        updateInsuranceLabel($widget, state.insurance);
        updateInsurancePlanLabel($widget, state.insurancePlan);
        updateInsurancePlanDisabledState($widget, state.insurance);
        updateWidgetCTA($widget);
        closeDropdownForElement($(this));
        openInsurancePlanDropdown($widget, state.insurance);
      },
    );

    $widget.on("click", '[id="insurance_plan"].disabled', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      updateInsurancePlanDisabledState($widget, state.insurance);
    });

    $widget.on("input", ".insurance-plan-search-input", function () {
      filterInsurancePlanOptions($widget);
    });

    $widget.on(
      "change",
      'input[type="radio"][data-name="Insurance Plan"]',
      function () {
        var value = $(this).val();
        state.insurancePlan = value || null;
        updateInsurancePlanLabel($widget, state.insurancePlan);
        updateWidgetCTA($widget);
        closeDropdownForElement($(this));
      },
    );

    // If the user taps an already-selected radio option on mobile, also close.
    $widget.on(
      "click",
      'input[type="radio"][data-name="Insurance"], input[type="radio"][data-name="Insurance Plan"], .filter-list_label[for]',
      function () {
        var $radio = $(this);
        if (!$radio.is('input[type="radio"]')) {
          var targetId = $radio.attr("for");
          if (targetId) {
            var $target = $widget
              .find('[id="' + targetId.replace(/"/g, '\\"') + '"]')
              .first();
            if (
              $target.is(
                'input[type="radio"][data-name="Insurance"], input[type="radio"][data-name="Insurance Plan"]',
              )
            ) {
              $radio = $target;
            }
          }
        }
        if (!$radio.length || !$radio.is('input[type="radio"]')) return;
        if ($radio.prop("checked")) {
          setTimeout(function () {
            closeDropdownForElement($radio);
          }, 0);
        }
      },
    );

    $widget.on("click", ".filter-list_input-group", function (e) {
      e.preventDefault();
      var $checkbox = $(this).find('input[type="checkbox"]');
      var $box = $(this).find(".w-checkbox-input");
      if (!$checkbox.length || !$box.length) return;

      var isChecked = !$checkbox.prop("checked");
      $checkbox.prop("checked", isChecked);
      $box.toggleClass("w--redirected-checked", isChecked);
      $checkbox.trigger("change");
    });

    $widget.on(
      "change",
      '.filter-list_component input[type="checkbox"]',
      function () {
        state.specialties = getSelectedSpecialties($widget);
        updateSpecialtyLabel($widget, state.specialties);
        updateWidgetCTA($widget);
      },
    );

    $widget.on("input", '[id="first-name"], [id="last-name"]', function () {
      updateWidgetCTA($widget);
    });

    bindDobHandlers($widget);
    bindDobPicker($widget);
    setupDropdownA11y($widget);

    $widget.on("click", ".provider-filter_close-box", function () {
      var $dropdown = $(this).closest(
        ".provider-filter_dropdown, .provider-filter_dopdown, .w-dropdown",
      );
      var $list = $dropdown.find('[id="dropdown-list-1"]').first();
      if (!$list.length) {
        $list = $widget.find('[id="dropdown-list-1"]').first();
      }
      if ($list.length) {
        if ($list.hasClass("open")) {
          $list.removeClass("open");
          $(this).attr("aria-expanded", "false");
        } else {
          $list.addClass("open");
          $(this).attr("aria-expanded", "true");
        }
      }
    });

    updateWidgetCTA($widget);
  }

  $(document).on(
    "click.heroFilterClose",
    ".w-button, .w-radio, .provider-filter_close-box",
    function () {
      $(".w-dropdown").trigger("w-close");
      try {
        var escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          keyCode: 27,
          code: "Escape",
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.activeElement.dispatchEvent(escapeEvent);
      } catch (e) {
        // ignore keyboard dispatch issues
      }
    },
  );

  var $widgets = getAllWidgets();
  applyConfiguredLandingPageModuleType();
  $widgets.each(function (index) {
    $(this).data("heroFilterInstance", index);
    initWidget($(this));
  });

  if ($widgets.length) {
    $(document).on("click.heroFilterState", function (event) {
      $widgets.each(function () {
        var $widget = $(this);
        var $toggle = findLocal($widget, "#state_filter").first();
        var $list = $widget.find('[id="dropdown-list-1"]').first();
        if (!$toggle.length || !$list.length) return;

        if (
          $toggle.is(event.target) ||
          $toggle.has(event.target).length ||
          $list.is(event.target) ||
          $list.has(event.target).length
        ) {
          return;
        }

        if ($list.hasClass("open")) {
          $list.removeClass("open");
          $toggle.attr("aria-expanded", "false");
        }
      });
    });
  }

  setTimeout(function () {
    applyConfiguredLandingPageModuleType();
    $widgets.each(function () {
      updateWidgetCTA($(this));
    });
  }, 100);

  setTimeout(applyConfiguredLandingPageModuleType, 500);
  setTimeout(applyConfiguredLandingPageModuleType, 1500);

  if (typeof MutationObserver !== "undefined" && document.body) {
    var quizModuleRewriteTimer;
    new MutationObserver(function () {
      clearTimeout(quizModuleRewriteTimer);
      quizModuleRewriteTimer = setTimeout(
        applyConfiguredLandingPageModuleType,
        100,
      );
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  fetchPayersData()
    .then(function () {
      dataReady = true;
      $widgets.each(function () {
        var $widget = $(this);
        var state = getWidgetState($widget);
        injectInsuranceOptions($widget);
        injectInsurancePlanOptions($widget, state.insurance);
        updateWidgetCTA($widget);
      });
    })
    .catch(function (error) {
      console.error("Error loading provider search payers:", error);
      dataReady = true;
      $widgets.each(function () {
        var $widget = $(this);
        var state = getWidgetState($widget);
        injectInsuranceOptions($widget);
        injectInsurancePlanOptions($widget, state.insurance);
        updateWidgetCTA($widget);
      });
    });
});
