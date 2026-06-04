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

  var insurancePlanOptions = {
      "Aetna": {
          "popular": [
              "Aetna Choice® POS II (Open Access)",
              "Aetna Choice POS II (Aetna HealthFund)",
              "Open Choice PPO",
              "Aetna Choice® POS (Open Access)",
              "Elect Choice EPO",
              "Aetna Select",
              "Aetna PPO",
              "Managed Choice (Open Access)"
          ],
          "all": [
              "(AK) Anchorage Mat-Su Community Plan",
              "(AK) PPO Plus Alaska",
              "(AZ) Summit Healthcare",
              "(CA) Whole Health - PrimeCare",
              "(CA) Whole Health - Providence",
              "(CA) Whole Health - Sharp",
              "(CA) Whole Health - Southern California",
              "(CT) Whole Health - Value Care Alliance and Trinity Health Of New England",
              "(FL) Whole Health - Baptist Health & St. Vincent's HealthCare",
              "(FL) Whole Health - Orlando",
              "(FL) Whole Health - Southwest Florida",
              "(GA) Georgia Community Network for AFA",
              "(GA) Georgia Community Network-HNO",
              "(GA) South Georgia Select - HNO",
              "(GA) South Georgia Select for AFA",
              "(GA) Whole Health - Emory Healthcare Network & Northside Hospital System",
              "(GA) Whole Health - My Meadows Care Health",
              "(IA & IL) Whole Health - UnityPoint Accountable Care, L.C.",
              "(IA & NE) Nebraska Health Network - Choice POS II",
              "(IA & NE) Nebraska Health Network - Managed Choice POS",
              "(IA & NE) Nebraska Health Network - Select (HMO)",
              "(IA) MIPPA (Midwest Independent Physicians, LLC)",
              "(IA) Patient Preferred",
              "(IA) Whole Health - Mercy Accountable Care Network",
              "(IL) HMO Value Plan",
              "(KS) Whole Health - Ascension Via Christi Healthier You",
              "(MD) Maryland Community Network - MCN",
              "(MI) Value Plus West Michigan - Select",
              "(MI) ValuePlus SE Michigan",
              "(MI) ValuePlus Upper Peninsula",
              "(MO) CoxHealth Preferred Network",
              "(MO) Freeman Preferred Network",
              "(MO) I-35 Preferred Network",
              "(MO) Whole Health - CoxHealth",
              "(NC and SC) Whole Health - Atrium Health",
              "(NC) Whole Health - Duke Health, WakeMed & THN-Cone Health",
              "(NC) Whole Health - Mission Health Partners",
              "(NC) Whole Health - Wake Forest Baptist Health",
              "(NE & IA) Whole Health - CHI Health Accountable Care Network",
              "(NE) MIPPA (Midwest Independent Physicians, LLC)",
              "(NJ) Whole Health - Hackensack Meridian Health",
              "(NJ) Whole Health - New Jersey",
              "(NJ) Whole Health - Virtua",
              "(NV) Health Network",
              "(NV) Whole Health - Las Vegas",
              "(NY) Whole Health - Metro NY",
              "(OH) MetroHealth Network",
              "(OH) MetroHealth Network HNO",
              "(OH) Mount Carmel Network Health Network Only",
              "(OH) Mount Carmel Network Select/OA Select HMO",
              "(OK) Whole - Health Oklahoma",
              "(OK) Whole Health - INTEGRIS Health Partners Network",
              "(OK) Whole Health - St. John OK Health Initiatives",
              "(OR) Whole Health - Zoom + Care",
              "(PA) Butler Health System - Open Access Select HMO",
              "(PA) Preferred Uniontown HMO & HNOnly (OAHMO)",
              "(PA) Uniontown Hospital - Open Access Select HMO",
              "(PA) Washington Health System - Open Access Select Plan HMO",
              "(PA) Whole Health - Lehigh Valley Health Network",
              "(TN) Whole Health - Tennessee",
              "(TX) Corpus Christi Medical Center HCA - AFA",
              "(TX) El Paso - Option One EPO",
              "(TX) El Paso - Option One Managed Choice POS",
              "(TX) EPO and Open Access Select Texas Health",
              "(TX) EPO Methodist San Antonio",
              "(TX) EPO St. David's Austin",
              "(TX) EPO Tyler Redbud",
              "(TX) EPO Tyler Yellow Rose",
              "(TX) KelseyCare - HMO",
              "(TX) Laredo Medical Center CHS - AFA",
              "(TX) Liberty",
              "(TX) Medical Neighborhood - Choice POS II",
              "(TX) Medical Neighborhood - Select HMO",
              "(TX) Methodist HCA San Antonio - AFA",
              "(TX) Savings Choice Corpus Christi Texas",
              "(TX) South Texas Health System - AFA",
              "(TX) St David's HCA Austin - AFA",
              "(TX) Whole Health - Baylor - Bryan College Station",
              "(TX) Whole Health - Baylor - Central Texas",
              "(TX) Whole Health - Baylor - Hill Country",
              "(VA) Whole Health - Gateway Health",
              "(WA) Washington Value Network HMO",
              "(WA) Whole Health - Puget Sound",
              "ActiveCare 1-HD",
              "ActiveCare 2",
              "ActiveCare Select",
              "Aexcel Choice POS II",
              "Aexcel Choice POS II ( HealthFund)",
              "Aexcel Elect Choice EPO",
              "Aexcel Elect Choice EPO (Open Access)",
              "Aexcel Managed Choice POS",
              "Aexcel Managed Choice POS (Open Access)",
              "Aexcel Open Access Elect Choice ( HealthFund)",
              "Aexcel Open Access Managed Choice POS (HealthFund)",
              "Aexcel Open Access Select ( HealthFund)",
              "Aexcel Plus Choice POS II",
              "Aexcel Plus Choice POS II ( HealthFund)",
              "Aexcel Plus Elect Choice EPO",
              "Aexcel Plus Elect Choice EPO (Open Access)",
              "Aexcel Plus Managed Choice POS",
              "Aexcel Plus Managed Choice POS (Open Access)",
              "Aexcel Plus Open Access Elect Choice ( HealthFund)",
              "Aexcel Plus Open Access Managed Choice POS (HealthFund)",
              "Aexcel Plus Open Access Select ( HealthFund)",
              "Aexcel Plus PPO",
              "Aexcel Plus PPO ( HealthFund)",
              "Aexcel Plus Select",
              "Aexcel Plus Select (Open Access)",
              "Aexcel PPO",
              "Aexcel PPO ( HealthFund)",
              "Aexcel Select",
              "Aexcel Select (Open Access)",
              "AFA Choice POS II 2500 HSA 100/80 CY",
              "Affordable Health Choice Indemnity",
              "Affordable Health Choices limited benefits insurance plan (SRC only)",
              "Alaska Open Choice PPO",
              "Alaska Open Choice PPO Plus Tiered",
              "AlaskaCare - Employee",
              "AlaskaCare - Employee/Retiree - All Other States",
              "AlaskaCare - Retiree Defined Contribution Plan",
              "AlaskaCare - Retiree Legacy Plan",
              "AlaskaCare Health Plans",
              "Arizona - Banner Bronze HMO",
              "Arizona - Banner S Silver HMO",
              "Arizona - Banner Silver HMO",
              "Arizona Banner HMO (ACA)",
              "Arizona Banner Open Access Managed Plus (ACA & AFA Performance Network)",
              "Arizona Banner Open Access Managed Plus (AFA Broad Network)",
              "Arizona Banner Performance EPO Plus (AFA Performance - Essential Plans)",
              "Arizona Banner PPO (ACA Broad Network)",
              "Assure Premier Plus Medicaid Dual SNP HMO",
              "AWH Northern CA HMO Bronze",
              "AWH Northern CA HMO Gold",
              "AWH Northern CA HMO Platinum",
              "AWH Northern CA HMO Silver",
              "AWH Southern CA HMO Bronze",
              "AWH Southern CA HMO Gold",
              "AWH Southern CA HMO Platinum",
              "AWH Southern CA HMO Silver",
              "AWH Southern CA OA Managed Choice POS",
              "AWH Southern CA OA Managed Choice POS HDHP",
              "AWH Southern California OA Managed Choice",
              "AZ Leap - Banner Health Network",
              "AZ Whole Health - Arizona Care Network",
              "AZ Whole Health - Banner Health Network",
              "AZ: Banner Choice POS II Multi Tier",
              "AZ: Banner Elect Choice Open Access/Elect Choice EPO",
              "AZ: Banner HMO",
              "AZ: Banner Managed Choice / Choice POS II",
              "AZ: Banner Open Access Select HMO",
              "AZ: Medicare Platinum Plan (HMO)",
              "AZ: Medicare Platinum Plan (PPO)",
              "AZ: Medicare Prime Plan (HMO)",
              "AZ: Medicare Prime Plus Plan (HMO)",
              "AZ: Open Access EPO Plus - Banner",
              "AZ: Open Access HMO - Banner",
              "AZ: PPO - Banner",
              "Base Open Access Choice PPO by Tesla",
              "Basic by General Motors",
              "Basic Choice POS II by Sysco Corporation",
              "Basic HMO (available in CA only)",
              "Behavioral Health Program",
              "Bronze HMO",
              "CA Whole Health",
              "CA Whole Health - Hill Physicians & Mercy Medical Group",
              "CA Whole Health - PrimeCare Physicians HMO",
              "CA Whole Health - PrimeCare Physicians OAMC",
              "CA: HMO Deductible Plan",
              "CA: Medicare Prime Plan (HMO)",
              "Carelink Network",
              "Choice II POS by Morgan Stanley",
              "Choice POS ( HealthFund)",
              "Choice POS II",
              "Choice POS II ( HealthFund)",
              "Choice POS II by Coca-Cola",
              "Choice POS II by Dow",
              "Choice POS II by Johnson & Johnson",
              "Choice POS II on the Altius Network",
              "Choice® POS (Open Access)",
              "Choice® POS II (Open Access)",
              "CO Medicare HMO Denver CO Prime Plan",
              "CO Whole Health - Colorado Front Range",
              "CO: Medicare Prime 1 (PPO)",
              "CO: Medicare Prime Plan (PPO)",
              "Columbia University Open Choice® - Plan 100",
              "Columbia University Open Choice® - Plan 90",
              "Comprehensive PPO by Bank of America",
              "Connected Care by General Motors",
              "Consumer HDHP by Bank of America",
              "Contribution by Walmart",
              "Cornell Program for Healthy Living",
              "Cornell University : Choice® POS II - Weill PPO",
              "Coventry Auto Injury",
              "Coventry Illinois Health Care Network",
              "Coventry Missouri Health Care Network",
              "Coventry Select PPO",
              "CT Whole Health - Connecticut Preferred Health Network",
              "CT: Medicare Prime PCP Elite (HMO)",
              "CVS Connected NC Network Plan",
              "DC Bronze, Silver and Gold HMO",
              "DC Bronze, Silver and Gold Open Access Elect Choice EPO",
              "DC Bronze, Silver, Gold Health Network Only",
              "DC Bronze, Silver, Gold Open Access (OAEPO)",
              "Elect Choice EPO",
              "Elect Choice EPO (Open Access)",
              "Elect Choice EPO (Open Access) on the Altius Network",
              "Employee Assistance Program",
              "FL Bronze South HMO",
              "FL Bronze South QHDHP HMO",
              "FL CVS Bronze: South HMO ON CHP Standard",
              "FL CVS Silver: ON Standard",
              "FL Gold South HMO",
              "FL Silver South HMO",
              "FL: Coventry Medicare Summit Plan (HMO SNP)",
              "FL: Medicare Assure (HMO D-SNP)",
              "FL: Medicare Assure Plus (HMO D-SNP)",
              "FL: Medicare Assure Value (HMO D-SNP)",
              "FL: Medicare Choice (HMO-POS)",
              "FL: Medicare Choice Plan (HMO-POS)",
              "FL: Medicare Summit Select (HMO)",
              "FL: North Broward Hospital District DBA Broward Health Choice® POS II",
              "FL: Select 1 (University of Miami)",
              "FL: Select 2 (University of Miami)",
              "FL: University of Miami: Choice POS II Open Access (HRA)",
              "Foreign Service Benefit Plan",
              "Freedom 10 (NJ)",
              "Freedom 15 (NJ)",
              "Freedom 1525 (NJ)",
              "Freedom 2030 (NJ)",
              "Freedom 2035 (NJ)",
              "GA: Medicare Advantra Preferred Plan (PPO)",
              "GA: Medicare Dual Preferred (HMO SNP)",
              "Gold HMO",
              "Golden Choice Plan (PPO)",
              "Golden Medicare Plan (HMO)",
              "HCA Well Care (Levels 1, 2 & 3)",
              "HDHP 3000-100 Tri-State",
              "HDHP by IBM",
              "HDHP by Metlife",
              "HDHP Option PPO by ConocoPhillips",
              "HDHP Plus by IBM",
              "Health Fund CDHP by Dell",
              "Health Network Only",
              "Health Network Only (Open Access)",
              "Health Network Only (Open Access) on the Altius Network",
              "Health Network Option",
              "Health Network Option (Open Access)",
              "Health Network Option (Open Access) on the Altius Network",
              "Health Savings Account",
              "Health Savings Account HSA by CVS",
              "HealthFund CDHP",
              "HealthFund Health Reimbursement Arrangement (HRA)",
              "HealthFund Health Savings Account (HSA)",
              "HealthFund HMO",
              "HealthFund HMO (available in CA only)",
              "HealthFund® Health Network Only (Open Access)",
              "HealthFund® Health Network Option (Open Access)",
              "HMO",
              "HMO Basic",
              "HMO Deductible",
              "ID Whole Health - St. Luke's Health Partners",
              "Idaho Advantage Network",
              "Idaho Peak Preference",
              "IL CVS Bronze: Chicago HMO ON Standard",
              "IL: Medicare Advantra 1 (HMO-POS)",
              "IL: Medicare Advantra 2 (HMO)",
              "IL: Medicare Gold Advantage Prime (HMO)",
              "IL: Medicare Plan (PPO) (Advantra)",
              "IL: Medicare Premier Advantra (PPO)",
              "IL: Medicare Premier Plus (PPO)",
              "Kansas Connector",
              "Kansas Wesley Preferred Network",
              "Kelseycare Health Plan",
              "Kentucky - Medicaid CHIP",
              "Leap Everyday",
              "LM HealthWorks Plan",
              "Managed Choice (Open Access)",
              "Managed Choice (Open Access) on the Altius Network",
              "Managed Choice Open Access POS",
              "Managed Choice Plan (PPO)",
              "Managed Choice POS",
              "Massachusetts - Student Health Benefit Plan Medicare PPO",
              "MD Bronze HNOption",
              "MD Bronze PPO",
              "MD Bronze, Silver and Gold HMO",
              "MD Bronze, Silver and Gold Open Access Health Network Only",
              "MD Silver and Gold EPO",
              "MD Silver, Gold Open Access (OAEPO)",
              "ME Whole Health - Maine",
              "Medical by Amazon",
              "Medicare Advantage",
              "Medicare Advantage PPO (SWSCHP)",
              "Medicare Advantage PPO ESA plan",
              "Medicare Advantra Cares (HMO D-SNP)",
              "Medicare Advantra Central Value (PPO)",
              "Medicare Advantra Credit Value (PPO)",
              "Medicare Advantra Eagle (HMO-POS)",
              "Medicare Advantra Elite (HMO-POS)",
              "Medicare Advantra Gold (HMO-POS)",
              "Medicare Advantra Gold (PPO)",
              "Medicare Advantra Philly Prime (HMO-POS)",
              "Medicare Advantra Preferred (PPO)",
              "Medicare Advantra Premier Plus (PPO)",
              "Medicare Advantra Select (HMO-POS)",
              "Medicare Advantra Silver (HMO-POS)",
              "Medicare Advantra Silver Plus (PPO)",
              "Medicare Advantra Value (HMO-POS)",
              "Medicare Assure Premier Medicaid Dual SNP HMO",
              "Medicare Bronze Plan (PPO)",
              "Medicare Choice Plan (PPO)",
              "Medicare Connect Plus (HMO-POS)",
              "Medicare Connect Plus (PPO)",
              "Medicare Core Elite Plan (PPO)",
              "Medicare Core Plan (PPO)",
              "Medicare Credit Plan (PPO)",
              "Medicare Deluxe Plan (PPO)",
              "Medicare Discover Plan (PPO)",
              "Medicare Discover Value Plan (PPO)",
              "Medicare Dual Preferred (PPO D-SNP)",
              "Medicare Eagle (HMO-POS)",
              "Medicare Eagle (HMO)",
              "Medicare Eagle Giveback (PPO)",
              "Medicare Eagle Plan (PPO)",
              "Medicare Eagle Plus II Plan (PPO)",
              "Medicare Eagle Plus Plan (PPO)",
              "Medicare Elite (PPO)",
              "Medicare Elite 1 (HMO-POS)",
              "Medicare Elite 2 (HMO-POS)",
              "Medicare Elite 3 (HMO)",
              "Medicare Elite Plan (HMO-POS)",
              "Medicare Elite Plan (HMO)",
              "Medicare Enhanced Select (PPO)",
              "Medicare Essential Elite Plan (PPO)",
              "Medicare Essential Plan (PPO)",
              "Medicare Explorer Elite (PPO)",
              "Medicare Explorer Plan (PPO)",
              "Medicare Explorer Premier (HMO-POS)",
              "Medicare Explorer Premier Plan (PPO)",
              "Medicare Explorer Premier Plus (HMO-POS)",
              "Medicare Explorer Value (HMO)",
              "Medicare Explorer Value (PPO)",
              "Medicare Extra Value Plan (HMO-POS)",
              "Medicare Freedom Core (PPO)",
              "Medicare Freedom Plan (PPO)",
              "Medicare Freedom Plus (PPO)",
              "Medicare Giveback Choice (PPO)",
              "Medicare Gold Advantage (HMO)",
              "Medicare Longevity Plan (HMO I-SNP)",
              "Medicare North Mississippi Health (HMO)",
              "Medicare Option 1 (HMO-POS)",
              "Medicare Option 2 (HMO)",
              "Medicare Philly Suburban Value (HMO-POS)",
              "Medicare Plan (HMO)",
              "Medicare Plan (Open Access HMO)",
              "Medicare Plan (PPO)",
              "Medicare Platinum Plan (HMO-POS)",
              "Medicare Platinum Plan (PPO)",
              "Medicare Platinum Plus Plan (HMO-POS)",
              "Medicare Plus Plan (PPO)",
              "Medicare PPO Prime Plan",
              "Medicare Preferred Plan (PPO)",
              "Medicare Preferred Premium Plan (PPO)",
              "Medicare Premier (HMO-POS)",
              "Medicare Premier 3 (HMO-POS)",
              "Medicare Premier Advantra (PPO)",
              "Medicare Premier Plan (HMO)",
              "Medicare Premier Plan (PPO)",
              "Medicare Premier Plus (PPO)",
              "Medicare Premier Preferred (HMO)",
              "Medicare Prime Credit (PPO)",
              "Medicare Prime Plan (HMO)",
              "Medicare Prime Premier (PPO)",
              "Medicare Prime Value (HMO-POS)",
              "Medicare Select Plan (HMO-POS)",
              "Medicare Select Plan (HMO)",
              "Medicare Select Plan (PPO)",
              "Medicare Signature (HMO)",
              "Medicare Signature (PPO)",
              "Medicare Silver (HMO-POS)",
              "Medicare Silver Back (PPO)",
              "Medicare SmartFit (HMO-POS)",
              "Medicare SmartFit (PPO)",
              "Medicare SmartFit Elite Plan (HMO-POS)",
              "Medicare SmartSaver Elite (HMO)",
              "Medicare SmartSaver Elite (PPO)",
              "Medicare South NJ Prime Elite (PPO)",
              "Medicare Standard Plan (HMO)",
              "Medicare Standard Plan (PPO)",
              "Medicare Sunrise Plan (HMO-POS)",
              "Medicare Supplement Plans",
              "Medicare The Valley Plan (PPO)",
              "Medicare Value Advantra (PPO)",
              "Medicare Value Plan (HMO)",
              "Medicare Value Plan (PPO)",
              "Medicare Value Plus (PPO)",
              "Medicare Value Plus Plan (HMO-POS)",
              "Medicare Value Plus Plan (HMO)",
              "Medicare Value Plus Plan (PPO)",
              "Medicare Value Plus Signature (PPO)",
              "Medicare Value Select Plan (HMO)",
              "Michigan - Medicare Assure Premier Medicaid Dual SNP HMO",
              "Missouri - Carelink Bronze EPO",
              "MO: Medicare Advantra 1 (HMO-POS)",
              "MO: Medicare Advantra 2 (HMO)",
              "MO: Medicare Assure Gold Prime (HMO D-SNP)",
              "MO: Medicare Gold Advantage Prime (HMO)",
              "MO: Medicare Gold Advantage Value Prime (HMO)",
              "MO: Medicare Prime (HMO-POS)",
              "Mobile Healthcare Plan (International)",
              "National Advantage Program",
              "NC: Medicare Core Plan (PPO)",
              "NC: Medicare Prime Plan (HMO)",
              "Nevada - Prime Plus Medicare HMO POS",
              "New York - Medicare Assure Medicaid Dual SNP HMO",
              "New York Certified PPO (Workers' Comp)",
              "New York Elect Choice EPO (For Qualified Conversion Plan Members Only)",
              "New York Elect Choice Open Access Savings Plus (OAEPO)",
              "New York Recommendation of Care PPO (Workers' Comp)",
              "New York Signature Elect Choice Open Access (OAEPO)",
              "NJ: Assure Premier Plus (HMO D-SNP)",
              "NJ: Liberty",
              "NJ: Medicare Credit Value (HMO)",
              "NJ: Medicare Explorer Elite (HMO)",
              "NJ: Medicare Explorer Premier (PPO)",
              "NJ: Medicare Explorer Premier Plus (HMO)",
              "NJ: Medicare Explorer Premier Plus (PPO)",
              "NJ: Medicare NNJ Prime Plan (HMO)",
              "NJ: Medicare Premier (Regional PPO)",
              "North Carolina - Employees State Health PPO",
              "North Carolina - Retirees State Health Medicare PPO",
              "North Carolina - State Health HDHP",
              "North Carolina - State Health PPO",
              "Northern Idaho Network",
              "Northwestern University: Open Choice",
              "NY Bronze OAEPO",
              "NY Bronze OAEPO w/ HSA",
              "NY Bronze Savings Plus OAEPO",
              "NY Gold OAEPO",
              "NY Gold Savings Plus OAEPO",
              "NY Silver Savings Plus OAEPO",
              "NY Tri-State EPO",
              "NY: Advantra Cares (HMO SNP)",
              "NY: Medicare Elite Plan (PPO)",
              "NY: Medicare Syracuse Plan (PPO)",
              "NYC Community Plan",
              "NYP - Choice POS II",
              "NYP - Open Access Select (EPO)",
              "OH Whole Health - Mercy Health",
              "OH: Medicare Advantra Silver (PPO)",
              "OH: Medicare Assure (HMO D-SNP)",
              "OH: Medicare Premier 1 (PPO)",
              "OH: Medicare Premier 2 (PPO)",
              "OH: Medicare Premier Plus 1 (Regional PPO)",
              "OH: Medicare Premier Plus 2 (Regional PPO)",
              "Open Access (HMO)",
              "Open Access Choice HSA by Tesla",
              "Open Access Elect Choice EPO ( Health Fund)",
              "Open Access Elect Choice with RX",
              "Open Access Managed Choice - NY Tri-State POS",
              "Open Access Managed Choice - NY Tri-State PPO",
              "Open Access Managed Choice POS ( Health Fund)",
              "Open Access Managed Choice PPO",
              "Open Access POS II (Broad)",
              "Open Access POS II (Performance Network)",
              "Open Access Select ( Health Fund)",
              "Open Access Select HMO (Broad)",
              "Open Access Select HMO (Performance)",
              "Open Access® Managed Choice® - NY Tri-State POS 15",
              "Open Choice PPO",
              "Open Choice PPO on the Altius Network",
              "Open Choice® PPO ( Health Fund)",
              "OpenAccess® Managed Choice® - HDHP Base Plan",
              "PA Whole Health - PinnacleHealth",
              "PA Whole Health - Valley Preferred",
              "PA Whole Health - WellSpan",
              "PA: Advantra Cares (HMO SNP)",
              "PA: Medicare Advantra Core (HMO)",
              "PA: Medicare Advantra Credit Value (PPO)",
              "PA: Medicare Advantra Gold (HMO)",
              "PA: Medicare Advantra Premier (PPO)",
              "PA: Medicare Advantra Premier Plus (PPO)",
              "PA: Medicare Advantra Silver (HMO)",
              "PA: Medicare Advantra Silver (PPO)",
              "PA: Medicare Gold Plan (PPO)",
              "PA: Medicare PinnacleHealth Prime (HMO)",
              "PA: Medicare Plan (HMO) (Advantra)",
              "PA: Medicare Silver (HMO)",
              "PCP Referral Plan (TX only)",
              "Peak Preference HNOnly (Open Access) on the Altius Network",
              "Peak Preference HNOption (Open Access) on the Altius Network",
              "Pennsylvania’s Employees Health Program (PEBTF) Custom HMO",
              "Plus Open Access Choice PPO by Tesla",
              "POS 30 MDCR Tri-State",
              "PPO",
              "PPO by Bank of America",
              "PPO by ExxonMobil",
              "PPO by IBM",
              "PPO by JPMorgan Chase",
              "Premier by Walmart",
              "Premier Care Network",
              "Premier Care Network (APCN) - Choice POSII",
              "Premier Care Network (APCN) - Open Access Select",
              "Premier Care Network Plus",
              "Premier Care Network Plus - Choice POSII",
              "Premier Care Network Plus - Open Access Select",
              "QPOS",
              "Quality Care Health Plan (QCHP) - IL",
              "Rural Carrier High Option Health Benefit Plan (NRLCA)",
              "S Bronze HMO",
              "S Bronze PPO",
              "S Silver HMO",
              "Saver by Walmart",
              "Savings Plus of California",
              "Savings Plus of Chicago, IL",
              "Savings Plus of Florida (Brevard and Tampa)",
              "Savings Plus of IL - Open Access Select HMO",
              "Savings Plus of Massachusetts",
              "Savings Plus of Metro, NY",
              "Savings Plus of New Jersey",
              "Savings Plus of Ohio",
              "Savings Plus of Ohio-HNO",
              "Savings Plus of Ohio-POSII",
              "Savings Plus of Southeast Pennsylvania",
              "Savings Plus of Texas",
              "Savings Plus Open Access Managed Choice POS",
              "Select",
              "Select (Open Access)",
              "Select (Open Access) on the Altius Network",
              "Select Open Access HMO by Johnson & Johnson",
              "Select SM HMO by Sysco Corporation",
              "Signature Administrators (PPO)",
              "Silver HMO",
              "SilverScript Choice (PDP Medicare)",
              "SilverScript Plus (PDP Medicare)",
              "Springfield Premier Choice POS II",
              "Standard PPO Plan",
              "Stanford Health Care Alliance",
              "Stanford Health Care Alliance SHC - LPCH - VC",
              "Student Health Plans",
              "Sutter Health Open Access Elect Choice EPO",
              "Sutter Health Open Access Managed Choice POS",
              "Texas - Preferred Medicare Dual SNP HMO",
              "TN Whole Health - Baptist/Select Health Alliance",
              "Traditional Choice® Indemnity",
              "TRS-Care Networks",
              "TX Bronze 5500 50% QHDHP HMO (Off Ex)",
              "TX Bronze 5500 50% QHDHP HMO PD",
              "TX Bronze 8700 100% HMO PD",
              "TX CVS Bronze: HMO OFF PD Standard",
              "TX CVS Bronze: HMO ON Standard",
              "TX CVS Gold HMO OFF PD Standard",
              "TX CVS Gold: HMO OFF",
              "TX CVS Gold: HMO OFF PD",
              "TX CVS Gold: HMO OFF Standard",
              "TX CVS Gold: HMO ON",
              "TX CVS Gold: HMO ON Standard",
              "TX CVS Silver 1: HMO OFF",
              "TX CVS Silver 1: HMO OFF PD",
              "TX CVS Silver 1: HMO ON",
              "TX CVS Silver 2: HMO OFF",
              "TX CVS Silver 2: HMO OFF PD",
              "TX CVS Silver 2: HMO ON",
              "TX CVS Silver 3: HMO OFF",
              "TX CVS Silver 3: HMO OFF PD",
              "TX CVS Silver 3: HMO ON",
              "TX CVS Silver 4: HMO OFF",
              "TX CVS Silver 4: HMO OFF PD",
              "TX CVS Silver 4: HMO ON",
              "TX CVS Silver: HMO OFF PD Standard",
              "TX CVS Silver: HMO OFF Standard",
              "TX CVS Silver: HMO ON Standard",
              "TX Gold $15 Copay 1450 HMO",
              "TX Gold $15 Copay 1450 HMO (Off-exchange)",
              "TX Gold $15 Copay 1450 HMO PD",
              "TX Silver $25 Copay 6000 HMO (Off Ex)",
              "TX Silver $25 Copay 6000 HMO PD",
              "TX Silver $30 Copay 4000 HMO (Off Ex)",
              "TX Silver $30 Copay 4000 HMO PD",
              "TX Silver 3 HMO 50% PD",
              "TX Whole Health - Baptist Health System & HealthTexas Medical Group",
              "TX Whole Health - Baylor Scott & White Quality Alliance",
              "TX Whole Health - Memorial Hermann Accountable Care Network",
              "TX Whole Health - Seton Health Alliance",
              "TX: Medicare Choice II Plan (PPO)",
              "TX: Medicare Dual Complete Plan (HMO D-SNP)",
              "TX: Medicare Prime Plan (HMO)",
              "USAccess®",
              "Utah Connected Network",
              "VA Medicare HMO VA Innovation Prime Plan",
              "VA Whole Health - Coastal Virginia Health Partners",
              "VA Whole Health - VA Preferred - Roanoke",
              "VA: /Innovation Health: Open POS II - PPO",
              "VA: Veterans Affairs Basic",
              "VA: with Innovation Health POS",
              "VA: with Innovation Health PPO",
              "VA: with Innovation Health Select HMO",
              "Value Network HMO",
              "Value Network HMO (available in CA and NV only)",
              "Value Performance Network",
              "Virginia - Cardinal Care Medicaid HMO",
              "Vision",
              "Vision Preferred® - High Option",
              "Voluntary Plans",
              "WA Whole Health - Rainier Health Network",
              "WA: Medicare Platinum Plan (HMO)",
              "WA: Medicare Platinum Plus Plan (HMO)",
              "WA: Medicare Value Plus Plan (HMO)",
              "Walmart HRA",
              "Walmart HSA",
              "Weill Cornell Medicine PPO",
              "WellShare Premium Plan",
              "WellShare Select Plan",
              "Whole Health - MemorialCare",
              "Whole Health - Mount Sinai Health Partners",
              "Whole Health by Coca-Cola",
              "Whole Health Network Bronze EPO",
              "Whole Health Network Gold EPO",
              "Whole Health Network Silver EPO",
              "Whole HealthSM",
              "WI Whole Health - The Aurora Network",
              "Wichita Preferred Choice POS II",
              "Wichita Preferred Elect Choice EPO (Open Access)",
              "Workers' Comp Access"
          ]
      },
      "All Savers": {
          "popular": [
              "Gold Choice",
              "Bronze Choice",
              "Silver Choice",
              "Bronze Choice HSA 6350",
              "Silver Compass",
              "Gold Choice 1500",
              "Bronze Choice 6350",
              "Silver Choice 3000"
          ],
          "all": [
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
              "Silver Navigate Plus"
          ]
      },
      "Blue Cross Blue Shield Companies": {
          "popular": [
              "BlueCard PPO",
              "BlueCard PPO Basic",
              "Federal Employee Program - Basic Option",
              "Federal Employee Program - Standard Option",
              "Medicare Advantage PPO",
              "BlueCard Traditional (Indemnity)",
              "National HMO",
              "UT Connect"
          ],
          "all": [
              "BlueCard PPO",
              "BlueCard PPO Basic",
              "BlueCard Traditional (Indemnity)",
              "Federal Employee Program - Basic Option",
              "Federal Employee Program - Standard Option",
              "Medicare Advantage PPO",
              "National HMO",
              "UT Connect"
          ]
      },
      "Cigna": {
          "popular": [
              "Open Access Plus",
              "Cigna PPO",
              "Choice Fund Open Access Plus",
              "Choice Fund PPO",
              "Cigna Open Access Plus In-Network",
              "Open Access Plan",
              "HMO",
              "Open Access (all deductible levels)"
          ],
          "all": [
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
              "Workers' Compensation"
          ]
      },
      "Devoted Health": {
          "popular": [
              "Devoted Health HMO",
              "Devoted Health HMO Prime",
              "Devoted Health Central Florida (HMO)",
              "Devoted Health Essentials Miami-Dade (HMO) Plan",
              "Devoted Health Miami-Dade (HMO)",
              "Devoted Health Prime Central Florida (HMO)",
              "Devoted Health Prime Miami-Dade (HMO) Plan",
              "Devoted Health Core Greater Tampa Bay (HMO) Plan"
          ],
          "all": [
              "Central Florida (HMO)",
              "Core Greater Tampa Bay (HMO) Plan",
              "Essentials Miami-Dade (HMO) Plan",
              "HMO",
              "HMO Prime",
              "Miami-Dade (HMO)",
              "Prime Central Florida (HMO)",
              "Prime Miami-Dade (HMO) Plan"
          ]
      },
      "Medicaid": {
          "popular": [
              "New York Medicaid",
              "Texas STAR (Medicaid)",
              "Colorado - Health First Western and SouthWestern RAE 1 Medicaid",
              "Florida Medicaid",
              "Georgia Medicaid",
              "Michigan Medicaid",
              "Illinois Medicaid",
              "Maryland HealthChoice"
          ],
          "all": [
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
              "Wyoming"
          ]
      },
      "Medical Mutual of Ohio": {
          "popular": [
              "SuperMed Plus (PPO)",
              "SuperMed Classic (PPO)",
              "MedMutual Advantage PPO",
              "OhioMed",
              "Personal Health Plan (PPO)",
              "SuperMed One (PPO)",
              "SuperMed Professional (PPO)",
              "HMO Health Ohio"
          ],
          "all": [
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
              "Vision Service Plan"
          ]
      },
      "Medicare": {
          "popular": [
              "Original Medicare Part A and B",
              "Medicare Part C: Medicare Advantage PPO plan",
              "Medigap Plan",
              "Medicare Part C: Medicare Advantage HMO plan",
              "Medicare Part C: Medicare Advantage Fee-for-Service (PFFS) plan",
              "Medicare Part C: Medicare Advantage Special Needs Plan (SNP) plan",
              "Medicare Part C: Medicare Advantage MSA plan"
          ],
          "all": [
              "Medigap Plan",
              "Original Part A and B",
              "Part C: Advantage Fee-for-Service (PFFS) plan",
              "Part C: Advantage HMO plan",
              "Part C: Advantage MSA plan",
              "Part C: Advantage PPO plan",
              "Part C: Advantage Special Needs Plan (SNP) plan"
          ]
      },
      "Meritain": {
          "popular": [
              "Aetna Choice POS II",
              "Aetna National PPO",
              "Open Choice PPO",
              "Aetna Premier Care Network",
              "Select Open Access",
              "Choice POS II by Meta"
          ],
          "all": [
              "Aetna Choice POS II",
              "Aetna National PPO",
              "Aetna Premier Care Network",
              "Choice POS II by Meta",
              "Open Choice PPO",
              "Select Open Access"
          ]
      },
      "Oxford": {
          "popular": [
              "Freedom Plan PPO",
              "Liberty Plan",
              "Oxford EPO (Freedom Network/Liberty Network)",
              "Oxford EPO Non Gated (Freedom Network)",
              "Liberty Plan EPO",
              "Freedom Plan Metro",
              "Freedom Plan (POS)",
              "Oxford EPO (Metro Network)"
          ],
          "all": [
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
              "Standard Indemnity"
          ]
      },
      "United Healthcare": {
          "popular": [
              "Choice Plus POS",
              "Choice EPO",
              "National Options Network PPO",
              "Choice Plus HMO",
              "Choice Plus Network UMR PPO",
              "Choice Plus PPO",
              "United Student Health Insurance Resources PPO",
              "Select Plus PPO"
          ],
          "all": [
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
              "W500 Emergent Wrap"
          ]
      },
      "United Medical Resources (UMR)": {
          "popular": [
              "Choice Plus PPO",
              "PPO by American Airlines"
          ],
          "all": [
              "Choice Plus PPO",
              "PPO by American Airlines"
          ]
      }
  };

  var disabledPlanNameCarriers = [
      "Aetna Medicare",
      "Cigna Local Plus",
      "Cigna Open Access Plus",
      "Community Health Network",
      "HealthSpring (Cigna Medicare)",
      "Independence Keystone Health",
      "UHC Medicare",
      "Wellmed",
      "Other"
  ];

  var condensedInsuranceCarrierNames = [
      "Aetna",
      "Aetna Medicare",
      "All Savers",
      "Blue Cross Blue Shield Companies",
      "Cigna",
      "Cigna Local Plus",
      "Cigna Open Access Plus",
      "Community Health Network",
      "Devoted Health",
      "HealthSpring (Cigna Medicare)",
      "Independence Keystone Health",
      "Medicaid",
      "Medical Mutual of Ohio",
      "Medicare",
      "Meritain",
      "Oxford",
      "UHC Medicare",
      "United Healthcare",
      "United Medical Resources (UMR)",
      "Wellmed",
      "Other"
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

  function getPayersSourceParam() {
    // The homepage endpoint is deprecated; always use the sign-up feed.
    return "sign-up";
  }

  function fetchPayersData() {
    var sourceParam = getPayersSourceParam();
    var cacheKey = "nourishHeroPayersData:" + sourceParam;
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
            payersData = cached.data;
            return Promise.resolve(payersData);
          }
        }
      }
    } catch (storageError) {
      // ignore storage issues
    }

    var url =
      "https://app." + window.__nourish_apex + "/api/payers?source=" +
      encodeURIComponent(sourceParam);

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
        payersData = Array.isArray(data) ? data : [];
        try {
          if (window.localStorage) {
            window.localStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), data: payersData })
            );
          }
        } catch (writeError) {
          // ignore write errors
        }
        return payersData;
      })
      .catch(function () {
        payersData = getFallbackPayersData();
        return payersData;
      });
  }

  function getFallbackPayersData() {
    return [
      {
        id: 333,
        payerName: "Independence Keystone Health",
        groupNameDeprecated: "Blue Cross Blue Shield",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Blue Cross Blue Shield",
        healthieId: 347,
        signUpFlowSortOrder: 18,
      },
      {
        id: 149,
        payerName: "Wellmed",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 17,
      },
      {
        id: 138,
        payerName: "All Savers",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 15,
      },
      {
        id: 136,
        payerName: "Medical Mutual of Ohio",
        groupNameDeprecated: "Medical Mutual of Ohio",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Medical Mutual of Ohio",
        healthieId: 1488,
        signUpFlowSortOrder: 13,
      },
      {
        id: 332,
        payerName: "Devoted Health",
        groupNameDeprecated: "Devoted Health",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Devoted Health",
        healthieId: 3718,
        signUpFlowSortOrder: 16,
      },
      {
        id: 142,
        payerName: "Cigna Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 1552,
        signUpFlowSortOrder: 14,
      },
      {
        id: 141,
        payerName: "Cigna Local Plus",
        groupNameDeprecated: null,
        isOON: true,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna Local Plus",
        healthieId: null,
        signUpFlowSortOrder: 12,
      },
      {
        id: 146,
        payerName: "Oxford",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 12,
      },
      {
        id: 145,
        payerName: "Meritain",
        groupNameDeprecated: "Aetna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 64,
        signUpFlowSortOrder: 11,
      },
      {
        id: 147,
        payerName: "UHC Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 1552,
        signUpFlowSortOrder: 10,
      },
      {
        id: 137,
        payerName: "Aetna Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 1552,
        signUpFlowSortOrder: 9,
      },
      {
        id: 148,
        payerName: "United Medical Resources (UMR)",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 8,
      },
      {
        id: 143,
        payerName: "Cigna Open Access Plus",
        groupNameDeprecated: "Cigna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 528,
        signUpFlowSortOrder: 7,
      },
      {
        id: 6,
        payerName: "Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Medicare",
        healthieId: 1552,
        signUpFlowSortOrder: 6,
      },
      {
        id: 144,
        payerName: "Medicaid",
        groupNameDeprecated: null,
        isOON: true,
        shouldHardMatchInsurance: false,
        displayGroup: "Medicaid",
        healthieId: null,
        signUpFlowSortOrder: 5,
      },
      {
        id: 3,
        payerName: "Cigna",
        groupNameDeprecated: "Cigna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 528,
        signUpFlowSortOrder: 4,
      },
      {
        id: 1,
        payerName: "Aetna",
        groupNameDeprecated: "Aetna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 64,
        signUpFlowSortOrder: 3,
      },
      {
        id: 2,
        payerName: "Blue Cross Blue Shield Companies",
        groupNameDeprecated: "Blue Cross Blue Shield",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Blue Cross Blue Shield",
        healthieId: 347,
        signUpFlowSortOrder: 2,
      },
      {
        id: 5,
        payerName: "United Healthcare",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 1,
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
        navigator.userAgent
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

    for (var i = 0; i < widgetSelectors.length; i++) {
      var selector = widgetSelectors[i];
      $(selector).each(function () {
        var node = this;
        if (seen.has(node)) return;
        var $node = $(node);
        if (
          $node.find("#home-filter-cta").length ||
          $node.find("#insurance_filter").length ||
          $node.find("#insurance-condensed_filter").length ||
          $node.find("#insurance_plan").length ||
          $node.find("#specialty_filter").length ||
          $node.find("#state_filter").length
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
          .find("#insurance_plan").length;
      });
    if (!$labels.length) return;

    var $toggle = $widget
      .find("#insurance-condensed_filter, #insurance_filter")
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
        "#insurance-condensed_filter .provider-filter_dropdown-label.filter, #insurance_filter .provider-filter_dropdown-label.filter"
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

    var $toggle = $widget.find("#insurance_plan").first();
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
      !Object.prototype.hasOwnProperty.call(insurancePlanOptions, state.insurance)
    ) {
      state.insurancePlan = null;
      $widget
        .find('input[type="radio"][data-name="Insurance Plan"]')
        .prop("checked", false);
    }
  }

  function updateInsurancePlanDisabledState($widget, carrierName) {
    var $planToggle = $widget.find("#insurance_plan").first();
    if (!$planToggle.length) return;

    var hasPlanOptions =
      !!carrierName &&
      Object.prototype.hasOwnProperty.call(insurancePlanOptions, carrierName);
    var shouldDisable =
      $widget.find("#insurance-condensed_filter").length > 0 && !hasPlanOptions;

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
    var $labels = $widget.find("#concern-text");
    if ($labels.length) {
      var $toggle = $widget.find("#specialty_filter").first();
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
    var $cta = $widget.find("#home-filter-cta").first();
    if ($cta.length) return $cta;
    return $widget.find('a[href*="' + getSignupHost() + '"]').first();
  }

  function getDropdownListContainer($widget, toggleSelector) {
    var $toggle = $widget.find(toggleSelector).first();
    if (!$toggle.length) return $();

    var $dropdown = $toggle.closest(".provider-filter_dopdown, .w-dropdown");
    if (!$dropdown.length) return $();

    return $dropdown.find(".filter-list_list-wrapper.filter-page.filter").first();
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

    var query = String($container.find(".insurance-plan-search-input").val() || "")
      .trim()
      .toLowerCase();

    var hasVisiblePopularPlans = false;
    var hasVisibleAllPlans = false;

    $container.find(".dynamic-insurance-plan").each(function () {
      var option = this;
      var text = option.getAttribute("data-option-value") || "";
      var isPopular = option.classList.contains(
        "dynamic-insurance-plan--popular"
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
  }

  function injectInsuranceOptions($widget) {
    if (!$widget || !$widget.length) return;

    var isCondensed = $widget.find("#insurance-condensed_filter").length > 0;
    var $container = getDropdownListContainer(
      $widget,
      isCondensed ? "#insurance-condensed_filter" : "#insurance_filter"
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
      carrierNames = condensedInsuranceCarrierNames.slice();
    } else {
      if (!payersData || !payersData.length) return;
      carrierNames = payersData
        .slice()
        .filter(function (payer) {
          return payer && payer.payerName;
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
        })
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
        })
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
    }

    if (popularPlans.length) {
      fragment.appendChild(
        createPlanSectionLabel(
          "Popular plans",
          "insurance-plan-section-label--popular"
        )
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
          className:
            "dynamic-insurance-plan dynamic-insurance-plan--popular",
        })
      );
    });

    if (popularPlans.length && allPlans.length) {
      fragment.appendChild(
        createFilterDividerRow("insurance-plan-results-divider")
      );
    }

    if (allPlans.length) {
      fragment.appendChild(
        createPlanSectionLabel("All plans", "insurance-plan-section-label--all")
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
        })
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
      ".w-dropdown-list, .provider-filter_dropdown"
    );
    if (!$dropdownList.length) return;

    var $dropdown = $dropdownList.closest(".w-dropdown");
    if (!$dropdown.length) {
      $dropdown = $dropdownList.closest(".provider-filter_dopdown");
    }

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

    $dropdownList.removeClass("open").slideUp(0);
    $dropdown
      .find(".provider-filter_dopdown-toggle, .w-dropdown-toggle")
      .attr("aria-expanded", "false")
      .removeClass("w--open");
  }

  function openInsurancePlanDropdown($widget, carrierName) {
    if (!$widget || !$widget.length) return;
    if (!$widget.find("#insurance-condensed_filter").length) return;
    if (!Object.prototype.hasOwnProperty.call(insurancePlanOptions, carrierName)) {
      return;
    }

    var $planToggle = $widget.find("#insurance_plan").first();
    if (
      !$planToggle.length ||
      $planToggle.hasClass("disabled") ||
      $planToggle.attr("aria-disabled") === "true"
    ) {
      return;
    }

    setTimeout(function () {
      if (
        $planToggle.hasClass("disabled") ||
        $planToggle.attr("aria-disabled") === "true" ||
        $planToggle.attr("aria-expanded") === "true"
      ) {
        return;
      }

      var $dropdown = $planToggle.closest(".provider-filter_dopdown");
      if (!$dropdown.length) {
        $dropdown = $planToggle.closest(".w-dropdown");
      }
      var $list = $dropdown.find(".w-dropdown-list").first();

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
      }

      setTimeout(function () {
        $widget.find(".insurance-plan-search-input").first().focus();
      }, 0);
    }, 80);
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
      if (vp.variationName)
        params.append("variationName", vp.variationName);
    }

    if (selectedInsurance) {
      var normalized = normalizeValue(selectedInsurance);
      if (normalized === "i'm paying for myself") {
        params.append("nourishPayerId", -1);
      } else if (normalized === "other") {
        params.append("nourishPayerId", -2);
      } else if (normalized === "i'll choose my insurance later") {
        // do not send nourishPayerId
      } else {
        var payerId = findPayerId(selectedInsurance);
        if (payerId) {
          params.append("nourishPayerId", payerId);
        }
      }
    }

    if (selectedInsurancePlan) {
      params.append("insurancePlanName", selectedInsurancePlan);
    }

    if (selectedState) {
      params.append("state", selectedState);
    }

    if (isInsuranceCheck) {
      window.InsuranceSearchInput = true;
      var firstName = $widget.find("#first-name").val();
      if (firstName) {
        params.append("firstName", firstName);
      }
      var lastName = $widget.find("#last-name").val();
      if (lastName) {
        params.append("lastName", lastName);
      }
      var dob = $widget.find("#dob").val();
      if (dob && dob.length === 10) {
        var convertedDOB = convertDOBForQuery(dob);
        if (convertedDOB) {
          params.append("patientBirthday", convertedDOB);
        }
      }
    } else {
      window.InsuranceSearchInput = false;
    }

    appendUtmParams(params);
    params.append("InsuranceSearchInput", isInsuranceCheck ? "true" : "false");

    var $cta = findWidgetCTA($widget);
    if ($cta && $cta.length) {
      var currentHref = $cta.attr("href");
      if (currentHref && currentHref.indexOf(getSignupHost()) !== -1) {
        try {
          var existingUrl = new URL(currentHref, window.location.origin);
          existingUrl.searchParams.forEach(function (value, key) {
            if (!params.has(key)) params.set(key, value);
          });
        } catch (e) {}
      }
      var finalUrl = baseUrl + "?" + params.toString();
      $cta.attr("href", finalUrl);
    }

    $('a[href*="' + getSignupHost() + '"]:not(#home-filter-cta)').each(
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
        $link.attr("href", url.toString());
      }
    );
  }

  function bindDobHandlers($widget) {
    var $dobInput = $widget.find("#dob");
    if (!$dobInput.length || $dobInput.data("heroFilterDobBound")) return;
    $dobInput.data("heroFilterDobBound", true);

    if (isMobileDevice()) {
      $dobInput.attr({
        inputmode: "numeric",
        pattern: "[0-9]*",
        autocomplete: "bday",
        placeholder: "MM/DD/YYYY",
      });
      $dobInput.addClass("mobile-dob-input");
    }

    $dobInput.on("input keydown keyup", function (e) {
      var $input = $(this);
      var value = $input.val();
      var cursorPosition = $input[0].selectionStart;

      if (e.type === "keydown") {
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
      }

      if (e.type === "keyup") {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          return;
        }
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
      $widget.find(selectors[i]).each(function () {
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
      }
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
      }
    );

    $widget.on("click", "#insurance_plan.disabled", function (e) {
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
      }
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
            var $target = $widget.find("#" + targetId);
            if (
              $target.is(
                'input[type="radio"][data-name="Insurance"], input[type="radio"][data-name="Insurance Plan"]'
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
      }
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
      }
    );

    $widget.on("input", "#first-name, #last-name", function () {
      updateWidgetCTA($widget);
    });

    bindDobHandlers($widget);
    setupDropdownA11y($widget);

    $widget.on("click", ".provider-filter_close-box", function () {
      var $dropdown = $(this).closest(
        ".provider-filter_dropdown, .provider-filter_dopdown, .w-dropdown"
      );
      var $list = $dropdown.find("#dropdown-list-1").first();
      if (!$list.length) {
        $list = $widget.find("#dropdown-list-1").first();
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
    }
  );

  var $widgets = getAllWidgets();
  $widgets.each(function (index) {
    $(this).data("heroFilterInstance", index);
    initWidget($(this));
  });

  if ($widgets.length) {
    $(document).on("click.heroFilterState", function (event) {
      $widgets.each(function () {
        var $widget = $(this);
        var $toggle = $widget.find("#state_filter").first();
        var $list = $widget.find("#dropdown-list-1").first();
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
    $widgets.each(function () {
      updateWidgetCTA($(this));
    });
  }, 100);

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
