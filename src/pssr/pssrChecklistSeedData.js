/*
 * داده‌ی Seed چک‌لیست‌های مرجع PSSR — استخراج‌شده عیناً از فایل اکسل رسمی
 * «PSSR Report -Rev00.xlsx» (۹ چک‌لیست تخصصی). محتوای requirement بدون
 * هیچ تغییری (حتی شماره‌گذاریِ ناپیوسته‌ی اصلی) حفظ شده تا مرجع مهندسی
 * دست‌نخورده بماند؛ فقط برای هر ردیف یک group (سرتیترِ بخش در فایل، مثل
 * «Switchgear») نگه داشته شده تا در UI دسته‌بندی شود.
 */
export const PSSR_CHECKLIST_SEED = [
  {
    "code": "electrical",
    "discipline": "electrical",
    "title": "Electrical",
    "requirements": [
      {
        "reqNo": "1",
        "group": "General",
        "text": "Pre-com documents are checked for all following parts? (Including test sheet and check lists, punch list, FAT report, As built drawing, updated LOTO register)",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": "General",
        "text": "Motor list and technical data sheets for motors are available.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": "General",
        "text": "Function List are available.",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": "General",
        "text": "Circuit diagrams of plant power supply are available.",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": "General",
        "text": "Electrically driven motors–set point of over current trip is correctly adjusted; diagrams are available; displays in operation; Motors are labeled",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": "General",
        "text": "All electrical equipment (distributors etc.) is provided with warning signs, marked and secured against being touched.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": "General",
        "text": "Access to switch room and rack room is cleared.",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": "General",
        "text": "Access to switch room and rack room is possible only for permitted personnel.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": "General",
        "text": "Cables are protected against fire as per engineering design specifications.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": "General",
        "text": "Temperature of motors, bearing, transformer,… is checked when loaded.",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": "General",
        "text": "Operation of manual and auto controls is checked.",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": "General",
        "text": "Safety cautions as per required permits are followed.",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": "General",
        "text": "Insulation and heat tracing are checked.",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": "Switchgear",
        "text": "Bus bar condition is checked.",
        "order": 14
      },
      {
        "reqNo": "15",
        "group": "Switchgear",
        "text": "Feeder's condition is checked.",
        "order": 15
      },
      {
        "reqNo": "16",
        "group": "Switchgear",
        "text": "Power and control cable connection is checked.",
        "order": 16
      },
      {
        "reqNo": "17",
        "group": "Switchgear",
        "text": "Space heater of all panels is checked.",
        "order": 17
      },
      {
        "reqNo": "18",
        "group": "Switchgear",
        "text": "Relay setting is checked.",
        "order": 18
      },
      {
        "reqNo": "19",
        "group": "Switchgear",
        "text": "Rated power of all feeders is checked.",
        "order": 19
      },
      {
        "reqNo": "20",
        "group": "Switchgear",
        "text": "Function test of feeder is done and checked.",
        "order": 20
      },
      {
        "reqNo": "21",
        "group": "Switchgear",
        "text": "Earth connections, numbers, location are checked.",
        "order": 21
      },
      {
        "reqNo": "22",
        "group": "Switchgear",
        "text": "Bus bar energizing is checked.",
        "order": 22
      },
      {
        "reqNo": "23",
        "group": "Switchgear",
        "text": "Pre-com activities are done and verified.",
        "order": 23
      },
      {
        "reqNo": "24",
        "group": "Switchgear",
        "text": "Functional test (e.g. inter-lock, inter-tripe, earthing interlock) have been done and checked.",
        "order": 24
      },
      {
        "reqNo": "25",
        "group": "Switchgear",
        "text": "All internal wiring is correctly looped and clearly identified.",
        "order": 25
      },
      {
        "reqNo": "26",
        "group": "Switchgear",
        "text": "All C.Ts, V.Ts & fuses are properly installed and as per data sheet.",
        "order": 26
      },
      {
        "reqNo": "27",
        "group": "Switchgear",
        "text": "Breaker/ isolator different status are checked.",
        "order": 27
      },
      {
        "reqNo": "28",
        "group": "Switchgear",
        "text": "control fuses removal is checked",
        "order": 28
      },
      {
        "reqNo": "29",
        "group": "Switchgear",
        "text": "Protection devices for load are checked.",
        "order": 29
      },
      {
        "reqNo": "30",
        "group": "Switchgear",
        "text": "Zone class (hazardous area classification) is checked and verified.",
        "order": 30
      },
      {
        "reqNo": "31",
        "group": "Switchgear",
        "text": "SAT is done.",
        "order": 31
      },
      {
        "reqNo": "32",
        "group": "Switchgear",
        "text": "Cells are tagged off.",
        "order": 32
      },
      {
        "reqNo": "34",
        "group": "Power transformer",
        "text": "Power and control cable are checked.",
        "order": 33
      },
      {
        "reqNo": "35",
        "group": "Power transformer",
        "text": "All protection devices are checked.",
        "order": 34
      },
      {
        "reqNo": "36",
        "group": "Power transformer",
        "text": "Tap changer is checked.",
        "order": 35
      },
      {
        "reqNo": "37",
        "group": "Power transformer",
        "text": "The oil transformer is checked.",
        "order": 36
      },
      {
        "reqNo": "38",
        "group": "Power transformer",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 37
      },
      {
        "reqNo": "39",
        "group": "Power transformer",
        "text": "Energizing is done and checked.",
        "order": 38
      },
      {
        "reqNo": "40",
        "group": "Power transformer",
        "text": "nameplate is checked as per data sheet",
        "order": 39
      },
      {
        "reqNo": "41",
        "group": "Power transformer",
        "text": "Pre-com activities are done and verified.",
        "order": 40
      },
      {
        "reqNo": "42",
        "group": "Power transformer",
        "text": "All bushing joint & seals are checked for fluid leakage.",
        "order": 41
      },
      {
        "reqNo": "43",
        "group": "Power transformer",
        "text": "All auxiliary equipment (e.g. pressure & temperature connections) is correctly installed and checked.",
        "order": 42
      },
      {
        "reqNo": "44",
        "group": "Power transformer",
        "text": "SAT is done.",
        "order": 43
      },
      {
        "reqNo": "45",
        "group": "Power transformer",
        "text": "Bus bar energizing is checked.",
        "order": 44
      },
      {
        "reqNo": "47",
        "group": "Electro motor",
        "text": "Power and control cable are checked.",
        "order": 45
      },
      {
        "reqNo": "48",
        "group": "Electro motor",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 46
      },
      {
        "reqNo": "49",
        "group": "Electro motor",
        "text": "The lubrication system is in operation and checked.",
        "order": 47
      },
      {
        "reqNo": "50",
        "group": "Electro motor",
        "text": "Feeder /LCS function test is in test position and checked.",
        "order": 48
      },
      {
        "reqNo": "51",
        "group": "Electro motor",
        "text": "nameplate is checked as per data sheet",
        "order": 49
      },
      {
        "reqNo": "52",
        "group": "Electro motor",
        "text": "Space heater is checked.",
        "order": 50
      },
      {
        "reqNo": "53",
        "group": "Electro motor",
        "text": "Pre-com activities (e.g. free run) are done.",
        "order": 51
      },
      {
        "reqNo": "54",
        "group": "Electro motor",
        "text": "RTDs works is done correctly and checked.",
        "order": 52
      },
      {
        "reqNo": "55",
        "group": "Electro motor",
        "text": "Rotation is checked",
        "order": 53
      },
      {
        "reqNo": "56",
        "group": "Heater",
        "text": "nameplate is checked as per data sheet",
        "order": 54
      },
      {
        "reqNo": "57",
        "group": "Heater",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 55
      },
      {
        "reqNo": "58",
        "group": "Heater",
        "text": "Entry & terminals are routed and installed correctly.",
        "order": 56
      },
      {
        "reqNo": "59",
        "group": "Heater",
        "text": "Power and control cable are checked.",
        "order": 57
      },
      {
        "reqNo": "60",
        "group": "Heater",
        "text": "The electrical resistance is checked.",
        "order": 58
      },
      {
        "reqNo": "61",
        "group": "Heater",
        "text": "insulation for heater is checked",
        "order": 59
      },
      {
        "reqNo": "62",
        "group": "Heater",
        "text": "Thermocouple is checked",
        "order": 60
      },
      {
        "reqNo": "63",
        "group": "Heater",
        "text": "Energizing is checked",
        "order": 61
      },
      {
        "reqNo": "65",
        "group": "Emergency diesel generator",
        "text": "nameplate is checked as per data sheet",
        "order": 62
      },
      {
        "reqNo": "66",
        "group": "Emergency diesel generator",
        "text": "Power and control cable are checked.",
        "order": 63
      },
      {
        "reqNo": "67",
        "group": "Emergency diesel generator",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 64
      },
      {
        "reqNo": "68",
        "group": "Emergency diesel generator",
        "text": "All protection devices are checked.",
        "order": 65
      },
      {
        "reqNo": "69",
        "group": "Emergency diesel generator",
        "text": "The lubrication system is in operation and checked.",
        "order": 66
      },
      {
        "reqNo": "70",
        "group": "Emergency diesel generator",
        "text": "Function test is in test position.",
        "order": 67
      },
      {
        "reqNo": "71",
        "group": "Emergency diesel generator",
        "text": "The synchronizing with other EDG is checked and verified.",
        "order": 68
      },
      {
        "reqNo": "72",
        "group": "Emergency diesel generator",
        "text": "The synchronizing with bus bar checked and verified.",
        "order": 69
      },
      {
        "reqNo": "73",
        "group": "Emergency diesel generator",
        "text": "The loading test is checked and verified.",
        "order": 70
      },
      {
        "reqNo": "74",
        "group": "Emergency diesel generator",
        "text": "The automatic starting is checked and verified.",
        "order": 71
      },
      {
        "reqNo": "75",
        "group": "Emergency diesel generator",
        "text": "Emergency LV bus bar for energizing is checked.",
        "order": 72
      },
      {
        "reqNo": "76",
        "group": "Emergency diesel generator",
        "text": "Cooling & Exhaust system are checked.",
        "order": 73
      },
      {
        "reqNo": "77",
        "group": "Emergency diesel generator",
        "text": "Battery electrolyte is at right level.",
        "order": 74
      },
      {
        "reqNo": "78",
        "group": "UPS system",
        "text": "nameplate is checked as per data sheet",
        "order": 75
      },
      {
        "reqNo": "79",
        "group": "UPS system",
        "text": "Power and control cable are checked.",
        "order": 76
      },
      {
        "reqNo": "80",
        "group": "UPS system",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 77
      },
      {
        "reqNo": "81",
        "group": "UPS system",
        "text": "UPS status is checked",
        "order": 78
      },
      {
        "reqNo": "82",
        "group": "UPS system",
        "text": "charging and discharging of batteries is checked",
        "order": 79
      },
      {
        "reqNo": "83",
        "group": "UPS system",
        "text": "The rectifier and inverter is working as per design specifications.",
        "order": 80
      },
      {
        "reqNo": "84",
        "group": "UPS system",
        "text": "Electrical Interlock between batteries and mechanical exhaust fan operation is checked.",
        "order": 81
      },
      {
        "reqNo": "85",
        "group": "Earthing system",
        "text": "lightning system to be checked and verified?",
        "order": 82
      },
      {
        "reqNo": "86",
        "group": "Earthing system",
        "text": "nameplate is checked as per data sheet.",
        "order": 83
      },
      {
        "reqNo": "87",
        "group": "Earthing system",
        "text": "all connections are checked.",
        "order": 84
      },
      {
        "reqNo": "88",
        "group": "Earthing system",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 85
      },
      {
        "reqNo": "89",
        "group": "Earthing system",
        "text": "Pre-com activities are done.",
        "order": 86
      },
      {
        "reqNo": "90",
        "group": "Earthing system",
        "text": "resistance of earth system is checked and verified.",
        "order": 87
      },
      {
        "reqNo": "91",
        "group": "Earthing system",
        "text": "main rod installation and connection is checked",
        "order": 88
      },
      {
        "reqNo": "92",
        "group": "Earthing system",
        "text": "main earth lines are checked and verified",
        "order": 89
      },
      {
        "reqNo": "93",
        "group": "Earthing system",
        "text": "earth connection to equipment is checked and verified",
        "order": 90
      },
      {
        "reqNo": "94",
        "group": "Cathodic Protection System",
        "text": "nameplate is checked as per data sheet.",
        "order": 91
      },
      {
        "reqNo": "95",
        "group": "Cathodic Protection System",
        "text": "all connections are checked.",
        "order": 92
      },
      {
        "reqNo": "96",
        "group": "Cathodic Protection System",
        "text": "NJBs / PJBs are checked.",
        "order": 93
      },
      {
        "reqNo": "97",
        "group": "Cathodic Protection System",
        "text": "cable connection to equipment (e.g. vessel, tank, pipe and drum)  is checked.",
        "order": 94
      },
      {
        "reqNo": "98",
        "group": "Cathodic Protection System",
        "text": "Pre-com activities are done.",
        "order": 95
      },
      {
        "reqNo": "99",
        "group": "Cathodic Protection System",
        "text": "Energizing is checked",
        "order": 96
      },
      {
        "reqNo": "100",
        "group": "Cathodic Protection System",
        "text": "Safety/ warning signs are installed",
        "order": 97
      },
      {
        "reqNo": "101",
        "group": "Cathodic Protection System",
        "text": "Electrical heat tracing is completed",
        "order": 98
      },
      {
        "reqNo": "102",
        "group": "Lighting (normal & emergency)",
        "text": "Lighting position, layout & number (as per project drawings) are checked and verified.",
        "order": 99
      },
      {
        "reqNo": "103",
        "group": "Lighting (normal & emergency)",
        "text": "Normal & emergency panel of lighting system are checked.",
        "order": 100
      },
      {
        "reqNo": "104",
        "group": "Lighting (normal & emergency)",
        "text": "Illumination (lux) of level gauge glasses is checked.",
        "order": 101
      },
      {
        "reqNo": "105",
        "group": "Lighting (normal & emergency)",
        "text": "Grounding (earth) connection is in place and checked",
        "order": 102
      },
      {
        "reqNo": "106",
        "group": "Lighting (normal & emergency)",
        "text": "Illumination (lux) of normal and emergency lighting systems is checked.",
        "order": 103
      },
      {
        "reqNo": "107",
        "group": "Lighting (normal & emergency)",
        "text": "Lighting certificates (e.g. explosion proof) are available as per design specifications.",
        "order": 104
      },
      {
        "reqNo": "108",
        "group": "Lighting (normal & emergency)",
        "text": "Is effect of power failure checked (Battery operation)?",
        "order": 105
      }
    ]
  },
  {
    "code": "instrument",
    "discipline": "instrument",
    "title": "Instrument",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All instrumentation equipment is installed and checked as per engineering design specifications (P&ID/ including Instrument hook-up diagram / Instrument installation specification / platform for readability if necessary / support against vibration if necessary).",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "All electrical and pneumatic loops are checked as per engineering design specifications.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Pre-com documents are checked for all following parts? (Including test sheet and check lists, punch list, FAT/SAT report, As built drawing).",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "All field devices (e.g. indicator, junction box, cabinet) and technical room cabins are protected as per specifications (e.g. IP, weather-proofed)",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "All instrumentation devices are calibrated and checked",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Partial stroke & Solenoid test is checked and verified on all ESDVs.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "F&G devices/ logics (e.g. emergency alarms) and shutdown devices (e.g. ESD, fire dampers) are tested and verified as per latest cause & effect.",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Identification (e.g. tag number) is checked.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Grounding (earth) connection is in place and checked",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "PSV set point is check and verified.",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Is effect of instrument air failure checked?",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Are emergency lightings in control room, power station in place & checked on regular basis?",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Measuring and safety devices (e.g. P/T transmitters, enclosure, flushing to flare ...) are in operation. (from mech rotary)",
        "order": 14
      }
    ]
  },
  {
    "code": "control_system",
    "discipline": "control_system",
    "title": "Control System",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Control functions are verified in accordance with latest cause & effect/shut down logic /pcs interlock.",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "DCS/PLC  logics are tested.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Grounding (earth) connection is in place and checked (IE&PE).",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "List of set points (pre- & main alarms, trips) are checked and verified.",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "UPS / batteries should be on service",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Data link (master/ slave) related to and Fiber optic are checked .",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "System/ marshalling cabinets in LCC are checked and verified. /FAT/SAT has been done",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "System cabinets are energized.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Marshalling cabinets are energized.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Data link (master/ slave) related to package are checked.",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Are emergency shutdown system operational and correct assignment documented / tested",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "USS system",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "F&G logics (e.g. emergency alarms) and shutdown logic (e.g. ESD) are tested and verified as per latest document.",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Checking ups1/2 and non ups power  for all cabinet",
        "order": 14
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "Data link (master/ slave)  related to PDCS are checked",
        "order": 15
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "interface signal’s between all LCC’& SS",
        "order": 16
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "requirement for automation system are checked and completed?",
        "order": 17
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "automation system license check and verify?",
        "order": 18
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "list of documents to be send to contractor?",
        "order": 19
      }
    ]
  },
  {
    "code": "telecom",
    "discipline": "telecom",
    "title": "Telecom",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Communication systems (e.g. fiber optic/ CCTV/ PABX/ AISS/ Hotline/ LAN/ ACU/ VHF/ UHF trunk/ PA&GA)) are tested and verified",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "Is PAGA system in service?",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Are Telecom check list regarding PAGA completed without any punch A & B?",
        "order": 3
      }
    ]
  },
  {
    "code": "piping_process",
    "discipline": "piping_process",
    "title": "Piping & Process",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Pre-commissioning (Pre-Com) documents have been reviewed and approved.",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "P&ID \"as built\" is available.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Piping is selected (material point of view), routed and valved as per approved PIDs.",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "All piping & valves have been installed and supported as per design specifications.",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Post construction leak tests, hydro tests and documentation have been completed.",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "All manual valves are checked.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "All flushing & draining activities are completed.",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "All construction blinds have been removed.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "All flanges have been checked for proper gaskets and installation.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "All drains and sewers have been inspected for plugs and covers.",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "All valves are rated for maximum operating pressure.",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "All valves are set in the proper position.",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "All check valves are installed in the proper flow direction.",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "PSV discharge piping will be unaffected or will tighten during actual discharge.",
        "order": 14
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "QC documentations (e.g. weld test) have been conducted and documented.",
        "order": 15
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "Piping has been installed to prevent freezing or plugging.",
        "order": 16
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "Piping supports are checked.",
        "order": 17
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "Piping documentations are available (including list & location of all blinds, Spades, spectacle & key locking)",
        "order": 18
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "Pipe tightness is checked and verified.",
        "order": 19
      },
      {
        "reqNo": "20",
        "group": null,
        "text": "Safety cautions as per required permits are followed.",
        "order": 20
      },
      {
        "reqNo": "21",
        "group": null,
        "text": "All piping and related connections are marked as per design specifications.",
        "order": 21
      },
      {
        "reqNo": "22",
        "group": null,
        "text": "Water/ foam monitor, hydrant are installed?",
        "order": 22
      },
      {
        "reqNo": "23",
        "group": null,
        "text": "Fire fighting equipment (e.g. water spray nozzle, deluge package, foaming package) are installed and checked as per engineering design documents.",
        "order": 23
      },
      {
        "reqNo": "24",
        "group": null,
        "text": "Safety shower and eye wash are installed?",
        "order": 24
      },
      {
        "reqNo": "25",
        "group": null,
        "text": "Leak tests of equipment (e.g. vessels, pipes, columns) are checked and verified",
        "order": 25
      },
      {
        "reqNo": "26",
        "group": null,
        "text": "chemicals are loaded in tanks?",
        "order": 26
      },
      {
        "reqNo": "27",
        "group": null,
        "text": "All chemical treatment activities (e.g. pickling, chemical cleaning) have been completed?",
        "order": 27
      },
      {
        "reqNo": "28",
        "group": null,
        "text": "All utility systems (e.g. air, steam, fuel) are in operation?",
        "order": 28
      },
      {
        "reqNo": "29",
        "group": null,
        "text": "hydraulic unit/pakage & network  are filled with appropriate oil ?",
        "order": 29
      },
      {
        "reqNo": "30",
        "group": null,
        "text": "All inerting activities are carried out?",
        "order": 30
      },
      {
        "reqNo": "31",
        "group": null,
        "text": "Car seals or locking devices on block valves & safety equipment are installed?",
        "order": 31
      },
      {
        "reqNo": "32",
        "group": null,
        "text": "PSV set point is check and verified?",
        "order": 32
      },
      {
        "reqNo": "33",
        "group": null,
        "text": "Temporary blanks required for start-up are defined, provided and installed.",
        "order": 33
      },
      {
        "reqNo": "34",
        "group": null,
        "text": "anti crossion material to be checked?",
        "order": 34
      },
      {
        "reqNo": "35",
        "group": null,
        "text": "open drain to be checked?",
        "order": 35
      },
      {
        "reqNo": "36",
        "group": null,
        "text": "آيا سيستم زهکشي بررسي و تاييد شده است؟",
        "order": 36
      },
      {
        "reqNo": "37",
        "group": null,
        "text": "ESD Procedures  is available?",
        "order": 37
      },
      {
        "reqNo": "38",
        "group": null,
        "text": "process by path system checked  and chemical connected to the sumps are checked and verified?",
        "order": 38
      }
    ]
  },
  {
    "code": "mechanic_fix",
    "discipline": "mechanic_fix",
    "title": "Mechanic (Fix)",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All equipment (e.g. pressure vessel /storage tank /strainer / filter / safety valve / rupture disc) are installed as per engineering design specifications.",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "General arrangement drawing (plot plan) is available",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Vessel and pipe documentation are available",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Pre-com activities are done and verified",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Safety valves are installed and tested.",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Rupture discs and breathing valves are installed and checked.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Vessels and ancillary pipes are cleaned and rinsed",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Leak tests of equipment (e.g. vessels, pipes, columns) are checked and verified.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Vessels and ancillary pipes are dried and neutralized",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Filters are checked and marked",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "All hand valves are checked and verified",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Safety cautions as per required permits are followed",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "chemicals are loaded in tanks",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 14
      }
    ]
  },
  {
    "code": "mechanic_rotary",
    "discipline": "mechanic_rotary",
    "title": "Mechanic (Rotary)",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "All equipment (pump / compressor / fan / blowers / diesel engine) is installed and test as per design specifications.",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "P&ID \"as built\" is available.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "General arrangement drawing (plot plan) is available.",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Pre-com activities (e.g. preservation) are done and verified",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Commissioning functional tests are completed and verified.",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Commissioning operational tests are completed and verified.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Manufacturer’s representative signed off.",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Adequate spare parts are considered and available.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Noise and vibration measurement is done for required machines and verified.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Minimum & Maximum flow requirement is considered and verified.",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Equipment grouted?",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Lube and drain connection are installed and checked.",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Mechanical catalogues is issued and available.",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "Lube oil flushing is carried out. All moving parts have been lubricated as per vendor instruction. Oil level is okay. Lube oil system is in operation and checked.",
        "order": 14
      },
      {
        "reqNo": "15",
        "group": null,
        "text": "Regarding rotating parts of equipment, required safety guards are in place.",
        "order": 15
      },
      {
        "reqNo": "16",
        "group": null,
        "text": "Mechanical seals are checked and verified.",
        "order": 16
      },
      {
        "reqNo": "17",
        "group": null,
        "text": "Level in suction vessel is checked and verified.",
        "order": 17
      },
      {
        "reqNo": "18",
        "group": null,
        "text": "Explosion doors are adjusted and verified.",
        "order": 18
      },
      {
        "reqNo": "19",
        "group": null,
        "text": "Cooling system is in operation and checked.",
        "order": 19
      },
      {
        "reqNo": "20",
        "group": null,
        "text": "Equipment is checked for mechanical damage.",
        "order": 20
      },
      {
        "reqNo": "21",
        "group": null,
        "text": "Coupling connection is done and checked",
        "order": 21
      }
    ]
  },
  {
    "code": "hse_erp_fifi",
    "discipline": "hse_fifi_env_health",
    "title": "HSE, ERP & FIFI",
    "requirements": [
      {
        "reqNo": "1",
        "group": "Safety Issues",
        "text": "Are spades, blinds, spectacle blinds and key locking list available?",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": "Safety Issues",
        "text": "Are lettering and colour coding sign done?",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": "Safety Issues",
        "text": "Scaffolding and temporary platforms removed as required to allow for safe operation?",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": "Safety Issues",
        "text": "All combustible material removed (e.g. scaffold boards, tarps, plastic, trash etc.)?",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": "Safety Issues",
        "text": "Safety representatives appointed",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": "Safety Issues",
        "text": "Are PPE protection warning signs installed?",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": "Safety Issues",
        "text": "Are Inerting systems in place?",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": "Safety Issues",
        "text": "Are all utility stations N2 instrument, operating air, steam and water lines marked up and in operation?",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": "Safety Issues",
        "text": "All road safety-related painting complete (cross walks, railings, kerbs, guardrails etc.)?",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": "Safety Issues",
        "text": "are plat forms and ladders constructed correctly ?",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": "Safety Issues",
        "text": "Are handrails , cages and guards Installed?",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": "Safety Issues",
        "text": "Are all safeguards including signs, chains etc. installed?",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": "Safety Issues",
        "text": "Are hot, cold surfaces insulated?",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": "Safety Issues",
        "text": "fire proofing coating is checked?",
        "order": 14
      },
      {
        "reqNo": "15",
        "group": "Safety Issues",
        "text": "Are required noise reduction systems in place?",
        "order": 15
      },
      {
        "reqNo": "16",
        "group": "Safety Issues",
        "text": "Rotating facilities covered",
        "order": 16
      },
      {
        "reqNo": "17",
        "group": "Safety Issues",
        "text": "All mechanical tools/equipment not required by the design or for operations have been removed",
        "order": 17
      },
      {
        "reqNo": "18",
        "group": "Safety Issues",
        "text": "Fire protective insulation of constructions and vessels in place",
        "order": 18
      },
      {
        "reqNo": "19",
        "group": "Safety Issues",
        "text": "Access routes for fire brigade are cleared.",
        "order": 19
      },
      {
        "reqNo": "20",
        "group": "Safety Issues",
        "text": "Are Safety Eq. check list completed(PPE & Machinery)",
        "order": 20
      },
      {
        "reqNo": "21",
        "group": "Safety Issues",
        "text": "Fire water network is tested (OTP) as per design specifications. Flushing & Cleaning?",
        "order": 21
      },
      {
        "reqNo": "22",
        "group": "Safety Issues",
        "text": "Water/ foam monitor, hydrant are installed & tested (OTP) as per design specifications.",
        "order": 22
      },
      {
        "reqNo": "23",
        "group": "Safety Issues",
        "text": "Fixed fire fighting equipment ( eg. foaming package & etc.) are installed & tested (OTP) as per design specifications..",
        "order": 23
      },
      {
        "reqNo": "24",
        "group": "Safety Issues",
        "text": "Loose fire fighting equipment (e.g. fire extinguishers, fire blankets) are arranged sufficiently in process and non-process areas as per design specifications.",
        "order": 24
      },
      {
        "reqNo": "25",
        "group": "Safety Issues",
        "text": "Are deluge system installed-completed-tested and operational(Operation test has been done?) water spray nozzle & fusible plugs are in service?",
        "order": 25
      },
      {
        "reqNo": "26",
        "group": "Safety Issues",
        "text": "Fire station building in operation as per commissioning requirements.",
        "order": 26
      },
      {
        "reqNo": "27",
        "group": "Safety Issues",
        "text": "Fire station building is equipped as per commissioning requirements",
        "order": 27
      },
      {
        "reqNo": "28",
        "group": "Safety Issues",
        "text": "Fire pump station is in operation as per commissioning requirements. Operation test has been done? )",
        "order": 28
      },
      {
        "reqNo": "29",
        "group": "Safety Issues",
        "text": "Fire fighting trucks (water, foam & powder) are provided as per commissioning requirements",
        "order": 29
      },
      {
        "reqNo": "30",
        "group": "Safety Issues",
        "text": "Mobile (trailer-mounted) fire fighting equipment is provided as per commissioning requirements.",
        "order": 30
      },
      {
        "reqNo": "31",
        "group": "Safety Issues",
        "text": "Fire fighting brigade is qualified and properly trained",
        "order": 31
      },
      {
        "reqNo": "32",
        "group": "Safety Issues",
        "text": "CO2 flooding system operational",
        "order": 32
      },
      {
        "reqNo": "33",
        "group": "Safety Issues",
        "text": "Are F&G Precom checklist completed?",
        "order": 33
      },
      {
        "reqNo": "34",
        "group": "Safety Issues",
        "text": "Are all F&G detectors calibrated & synchronized with F&G panel?",
        "order": 34
      },
      {
        "reqNo": "35",
        "group": "Safety Issues",
        "text": "Are Instrument test sheet regarding Analyser & actuated valve (ESD, BDV , …) completed",
        "order": 35
      },
      {
        "reqNo": "36",
        "group": "Safety Issues",
        "text": "Are Instrument function test regarding F&G completed?",
        "order": 36
      },
      {
        "reqNo": "37",
        "group": "Safety Issues",
        "text": "Are operation test for F&G/ESD system has been done?",
        "order": 37
      },
      {
        "reqNo": "38",
        "group": "Safety Issues",
        "text": "Signal of fire detection system routed to control room and tested",
        "order": 38
      },
      {
        "reqNo": "39",
        "group": "Safety Issues",
        "text": "Fire alarm system checked and sufficient; Documentation available",
        "order": 39
      },
      {
        "reqNo": "40",
        "group": "Safety Issues",
        "text": "Is PAGA system in service?",
        "order": 40
      },
      {
        "reqNo": "40",
        "group": "Safety Issues",
        "text": "storage and warehouse safety for  chemical and other needed material for sturtup checked and verified.",
        "order": 41
      },
      {
        "reqNo": "41",
        "group": "Safety Issues",
        "text": "Feeder /LCS function test is in test position and checked.",
        "order": 42
      },
      {
        "reqNo": "42",
        "group": "Environmental Issues",
        "text": "Is disposal material organised ?",
        "order": 43
      },
      {
        "reqNo": "43",
        "group": "Environmental Issues",
        "text": "Commissioning environmental aspects have been considered in operating/ commissioning manuals and followed accordingly.",
        "order": 44
      },
      {
        "reqNo": "44",
        "group": "Environmental Issues",
        "text": "Facilities for conducting of wastewater into treatment in operation.",
        "order": 45
      },
      {
        "reqNo": "45",
        "group": "Environmental Issues",
        "text": "is waste water treatment in service?",
        "order": 46
      },
      {
        "reqNo": "46",
        "group": "Environmental Issues",
        "text": "Facilities for collecting & conducting of effluent into treatment are in operation.",
        "order": 47
      },
      {
        "reqNo": "46",
        "group": "Environmental Issues",
        "text": "Soil pollution is prevented as per project design specifications. Measures to be checked and verified.",
        "order": 48
      },
      {
        "reqNo": "47",
        "group": "Environmental Issues",
        "text": "Emission to air is controlled as per project design specifications (e.g. waste & emission inventory). Measures to be checked and verified.",
        "order": 49
      },
      {
        "reqNo": "48",
        "group": "Environmental Issues",
        "text": "Oil spillage is controlled. Preventive measures to be checked and verified.",
        "order": 50
      },
      {
        "reqNo": "49",
        "group": "Environmental Issues",
        "text": "Temporary disposal area is checked and verified.",
        "order": 51
      },
      {
        "reqNo": "49",
        "group": "Environmental Issues",
        "text": "List of all hazardous substances are available",
        "order": 52
      },
      {
        "reqNo": "50",
        "group": "Emergency Response Plan",
        "text": "ERP is available and approved (responsibilities are  clarified)",
        "order": 53
      },
      {
        "reqNo": "51",
        "group": "Emergency Response Plan",
        "text": "Are emergency radio channel available",
        "order": 54
      },
      {
        "reqNo": "52",
        "group": "Emergency Response Plan",
        "text": "Personnel are properly aware about ERP & their roles in this regards.",
        "order": 55
      },
      {
        "reqNo": "53",
        "group": "Emergency Response Plan",
        "text": "All personnel are aware about ERP & their responsibilities?",
        "order": 56
      },
      {
        "reqNo": "54",
        "group": "Emergency Response Plan",
        "text": "Action plans for possible events/ incidents are available",
        "order": 57
      },
      {
        "reqNo": "55",
        "group": "Emergency Response Plan",
        "text": "Alarm plans/ MSDS/... are available at fire station.",
        "order": 58
      },
      {
        "reqNo": "56",
        "group": "Emergency Response Plan",
        "text": "Alarm and signal of safety systems (F&G system) are tested (OTP) properly.",
        "order": 59
      },
      {
        "reqNo": "57",
        "group": "Emergency Response Plan",
        "text": "required internal & external communication channels have been provided and checked as per ERP",
        "order": 60
      },
      {
        "reqNo": "58",
        "group": "Emergency Response Plan",
        "text": "ERP exercises & drills are carried out regularly",
        "order": 61
      },
      {
        "reqNo": "59",
        "group": "Emergency Response Plan",
        "text": "Emergency team members are qualified and properly trained",
        "order": 62
      },
      {
        "reqNo": "60",
        "group": "Emergency Response Plan",
        "text": "Emergency call lists (e.g. authorities, medical services) are available.",
        "order": 63
      },
      {
        "reqNo": "61",
        "group": "Emergency Response Plan",
        "text": "Drill results and findings are investigated.",
        "order": 64
      },
      {
        "reqNo": "62",
        "group": "Emergency Response Plan",
        "text": "Escape routes and evacuation plan are cleared and marked.",
        "order": 65
      },
      {
        "reqNo": "63",
        "group": "Emergency Response Plan",
        "text": "Gathering (muster) points are defined and marked",
        "order": 66
      },
      {
        "reqNo": "64",
        "group": "Emergency Response Plan",
        "text": "Daily up-dated road map of site is available at fire station.",
        "order": 67
      },
      {
        "reqNo": "65",
        "group": "Emergency Response Plan",
        "text": "Escape mask set is available for all personnel.",
        "order": 68
      },
      {
        "reqNo": "66",
        "group": "Emergency Response Plan",
        "text": "Portable toxic gas detector is available for Effective personnel.",
        "order": 69
      },
      {
        "reqNo": "67",
        "group": "Emergency Response Plan",
        "text": "ERP is upgraded with respect to changes, modifications, new requirements.",
        "order": 70
      },
      {
        "reqNo": "68",
        "group": "Emergency Response Plan",
        "text": "Safety shower and eye wash facilities are properly installed, tested & operational (OTP)?",
        "order": 71
      },
      {
        "reqNo": "69",
        "group": "Emergency Response Plan",
        "text": "General alarm available and tested",
        "order": 72
      },
      {
        "reqNo": "70",
        "group": "Emergency Response Plan",
        "text": "SCBA available as appropriate?",
        "order": 73
      },
      {
        "reqNo": "71",
        "group": "Emergency Response Plan",
        "text": "Red line operational",
        "order": 74
      },
      {
        "reqNo": "72",
        "group": "Emergency Response Plan",
        "text": "Housekeeping procedure is defined and followed",
        "order": 75
      },
      {
        "reqNo": "73",
        "group": "Emergency Response Plan",
        "text": "Fixed  TGD are checked and ready?",
        "order": 76
      },
      {
        "reqNo": "74",
        "group": "Emergency Response Plan",
        "text": "Emergency and HSE signal inpute to specific panel",
        "order": 77
      },
      {
        "reqNo": "75",
        "group": "Emergency Response Plan",
        "text": "The height of chemney to be corrected",
        "order": 78
      },
      {
        "reqNo": "76",
        "group": "Emergency Response Plan",
        "text": "Emergency electricity and emergency lighting must be connected to critical equipment.",
        "order": 79
      },
      {
        "reqNo": "77",
        "group": "Documentation",
        "text": "Pre-Com & Com/ Operating manual are available",
        "order": 80
      },
      {
        "reqNo": "78",
        "group": "Documentation",
        "text": "The start-up procedures is available",
        "order": 81
      },
      {
        "reqNo": "79",
        "group": "Documentation",
        "text": "material safety data sheets are available",
        "order": 82
      },
      {
        "reqNo": "80",
        "group": "Documentation",
        "text": "Commissioning safety Procedures (e.g. PTW, SIMOPS) are available and followed.",
        "order": 83
      },
      {
        "reqNo": "81",
        "group": "Documentation",
        "text": "Safety cautions as per required permits are followed.",
        "order": 84
      },
      {
        "reqNo": "81",
        "group": "Documentation",
        "text": "Management Of Change (MOC) is established & Executed?",
        "order": 85
      },
      {
        "reqNo": "82",
        "group": "Hazard Identification",
        "text": "Risk assessment procedure is available",
        "order": 86
      },
      {
        "reqNo": "83",
        "group": "Hazard Identification",
        "text": "Risk assessment has been done according to the occupational safety and health requirements.",
        "order": 87
      },
      {
        "reqNo": "84",
        "group": "Hazard Identification",
        "text": "Hazardous substances register is available",
        "order": 88
      },
      {
        "reqNo": "85",
        "group": "Hazard Identification",
        "text": "All recommended actions (RA findings) for safe start-up have been considered.",
        "order": 89
      },
      {
        "reqNo": "86",
        "group": "Hazard Identification",
        "text": "Commissioning JSA Procedure is available",
        "order": 90
      },
      {
        "reqNo": "87",
        "group": "Training",
        "text": "Training plan is available and followed",
        "order": 91
      },
      {
        "reqNo": "88",
        "group": "Training",
        "text": "Training facilities (e.g. document, equipment) are provided to enhance results and motivate trainees.",
        "order": 92
      },
      {
        "reqNo": "89",
        "group": "Communication",
        "text": "Communication plan is available",
        "order": 93
      },
      {
        "reqNo": "90",
        "group": "Communication",
        "text": "Communication system is available",
        "order": 94
      },
      {
        "reqNo": "91",
        "group": "Incident Investigation Reporting",
        "text": "Action plans for possible events/incidents are available",
        "order": 95
      },
      {
        "reqNo": "92",
        "group": "Machinery/ Equipment safety",
        "text": "safeguards are provided to meet the minimum safety requirements",
        "order": 96
      },
      {
        "reqNo": "93",
        "group": "Machinery/ Equipment safety",
        "text": "Worker's hands, fingers, and body are kept out the danger area.",
        "order": 97
      },
      {
        "reqNo": "94",
        "group": "Electrical safety",
        "text": "Electrical safety procedure is defined and followed",
        "order": 98
      },
      {
        "reqNo": "95",
        "group": "Electrical safety",
        "text": "LOTO system is defined and followed",
        "order": 99
      },
      {
        "reqNo": "96",
        "group": "Electrical safety",
        "text": "Power panels are equipped with RCCB device.",
        "order": 100
      },
      {
        "reqNo": "97",
        "group": "Electrical safety",
        "text": "Power panels are grounded as per safety requirements.",
        "order": 101
      },
      {
        "reqNo": "98",
        "group": "Electrical safety",
        "text": "Temporary Panels are removed",
        "order": 102
      },
      {
        "reqNo": "99",
        "group": "Electrical safety",
        "text": "are portable cabins have electrical  safety checklist and followed?",
        "order": 103
      },
      {
        "reqNo": "100",
        "group": "PPE",
        "text": "Are PPE protection warning signs installed?",
        "order": 104
      },
      {
        "reqNo": "101",
        "group": "PPE",
        "text": "PPE (e.g. goggle, harness, helmet, welding shield, ear plug & muff,...) are provided for each job",
        "order": 105
      },
      {
        "reqNo": "102",
        "group": "PPE",
        "text": "All personnel have been trained to use PPE correctly.",
        "order": 106
      }
    ]
  },
  {
    "code": "civil",
    "discipline": "civil",
    "title": "Civil",
    "requirements": [
      {
        "reqNo": "1",
        "group": null,
        "text": "Documents regarding pre-com operations are checked.",
        "order": 1
      },
      {
        "reqNo": "2",
        "group": null,
        "text": "Steel Structural is installed as per engineering design specifications.",
        "order": 2
      },
      {
        "reqNo": "3",
        "group": null,
        "text": "Concrete installed as per engineering design specifications.",
        "order": 3
      },
      {
        "reqNo": "4",
        "group": null,
        "text": "Sewers/ drains installed as per engineering design specifications and tested.",
        "order": 4
      },
      {
        "reqNo": "5",
        "group": null,
        "text": "Cable trenches are tiled and sand filled.",
        "order": 5
      },
      {
        "reqNo": "6",
        "group": null,
        "text": "Open ditches are fair sloped and cleaned for water leading.",
        "order": 6
      },
      {
        "reqNo": "7",
        "group": null,
        "text": "Fire wall installed for ESD valves and deluge packages.",
        "order": 7
      },
      {
        "reqNo": "8",
        "group": null,
        "text": "Paving in units extended; hunches are fair enough and extension joints are installed.",
        "order": 8
      },
      {
        "reqNo": "9",
        "group": null,
        "text": "Foundation grouted and completed.",
        "order": 9
      },
      {
        "reqNo": "10",
        "group": null,
        "text": "Manholes are lining and wall is completed.",
        "order": 10
      },
      {
        "reqNo": "11",
        "group": null,
        "text": "Passive fire protection (paint-base and cement-base coating) are installed and checked.",
        "order": 11
      },
      {
        "reqNo": "12",
        "group": null,
        "text": "Plans of foundations and underground pipes are available in term of \"as built\".",
        "order": 12
      },
      {
        "reqNo": "13",
        "group": null,
        "text": "Thermal insulation of equipment (column and vessel) is in place.",
        "order": 13
      },
      {
        "reqNo": "14",
        "group": null,
        "text": "anti acid & anti lining protection are install and checked?",
        "order": 14
      }
    ]
  }
];
