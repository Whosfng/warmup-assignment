const fs = require("fs");

function timeToSeconds(timeStr) {
    let timeString = timeStr.trim();
    let isPM = timeString.toLowerCase().includes("pm");
    let isAM = timeString.toLowerCase().includes("am");
    let timeOnly = timeString.replace(/am|pm/i, "").trim();
    let parts = timeOnly.split(":");
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let s = parseInt(parts[2], 10);

    if (isAM && h === 12) h = 0;
    else if (isPM && h !== 12) h += 12;

    return (h * 3600) + (m * 60) + s;
}


function secondsToTimeString(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;
    let mStr = m < 10 ? "0" + m : m;
    let sStr = s < 10 ? "0" + s : s;
    return h + ":" + mStr + ":" + sStr;
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    if (endSec < startSec) {
        endSec += 86400;
    }

    return secondsToTimeString(endSec - startSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    if (endSec < startSec) {
        endSec += 86400;
    }

    let getOverlap = (s, e, i_s, i_e) => Math.max(0, Math.min(e, i_e) - Math.max(s, i_s));

    let idleSec = getOverlap(startSec, endSec, 0, 28800) +
        getOverlap(startSec, endSec, 79200, 115200) +
        getOverlap(startSec, endSec, 165600, 201600);

    return secondsToTimeString(idleSec);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    return secondsToTimeString(timeToSeconds(shiftDuration) - timeToSeconds(idleTime));
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let activeSec = timeToSeconds(activeTime);
    let requiredQuota = (8 * 3600) + (24 * 60);

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        requiredQuota = 6 * 3600;
    }

    return activeSec >= requiredQuota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let lines = fs.existsSync(textFile) ? fs.readFileSync(textFile, "utf8").split(/\r?\n/) :[];
    let lastDriverIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim() === "") continue;
        let columns = line.split(",");
        let id = columns[0].trim();
        let recordDate = columns[2].trim();

        if (id === shiftObj.driverID && recordDate === shiftObj.date) {
            return {};
        }
        if (id === shiftObj.driverID) {
            lastDriverIndex = i;
        }
    }

    shiftObj.shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    shiftObj.idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    shiftObj.activeTime = getActiveTime(shiftObj.shiftDuration, shiftObj.idleTime);
    shiftObj.metQuota = metQuota(shiftObj.date, shiftObj.activeTime);
    shiftObj.hasBonus = false;

    let newRecordString =[
        shiftObj.driverID, shiftObj.driverName, shiftObj.date,
        shiftObj.startTime, shiftObj.endTime, shiftObj.shiftDuration,
        shiftObj.idleTime, shiftObj.activeTime, shiftObj.metQuota, shiftObj.hasBonus
    ].join(",");

    if (lastDriverIndex !== -1) {
        lines.splice(lastDriverIndex + 1, 0, newRecordString);
    } else {
        if (lines.length > 0 && lines[lines.length - 1].trim() === "") {
            lines[lines.length - 1] = newRecordString;
        } else {
            lines.push(newRecordString);
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), "utf8");
    return shiftObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    if (!fs.existsSync(textFile)) return;

    let content = fs.readFileSync(textFile, "utf8");
    let isWindows = content.includes("\r\n");
    let lines = content.split(/\r?\n/);
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        let columns = lines[i].split(",");
        if (columns[0].trim() === driverID && columns[2].trim() === date) {
            columns[9] = newValue.toString();
            lines[i] = columns.join(",");
            modified = true;
            break;
        }
    }

    if (modified) {
        let newlineChar = isWindows ? "\r\n" : "\n";
        fs.writeFileSync(textFile, lines.join(newlineChar), "utf8");
    }
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    if (!fs.existsSync(textFile)) return -1;
    let lines = fs.readFileSync(textFile, "utf8").split(/\r?\n/);
    let driverExists = false;
    let bonusCount = 0;
    let targetMonth = parseInt(month, 10);

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        let columns = lines[i].split(",");
        if (columns[0].trim() === driverID) {
            driverExists = true;
            let recordMonth = parseInt(columns[2].trim().split("-")[1], 10);
            if (recordMonth === targetMonth && columns[9].trim() === "true") {
                bonusCount++;
            }
        }
    }

    return driverExists ? bonusCount : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let totalSeconds = 0;
    if (!fs.existsSync(textFile)) return secondsToTimeString(totalSeconds);

    let lines = fs.readFileSync(textFile, "utf8").split(/\r?\n/);
    let targetMonth = parseInt(month, 10);

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        let columns = lines[i].split(",");
        if (columns[0].trim() === driverID) {
            let recordMonth = parseInt(columns[2].trim().split("-")[1], 10);
            if (recordMonth === targetMonth) {
                totalSeconds += timeToSeconds(columns[7].trim());
            }
        }
    }

    return secondsToTimeString(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    if (!fs.existsSync(rateFile) || !fs.existsSync(textFile)) return "0:00:00";

    let rateLines = fs.readFileSync(rateFile, "utf8").split(/\r?\n/);
    let dayOff = "";

    for (let i = 0; i < rateLines.length; i++) {
        if (rateLines[i].trim() === "") continue;
        let columns = rateLines[i].split(",");
        if (columns[0].trim() === driverID) {
            dayOff = columns[1].trim();
            break;
        }
    }

    let totalRequiredSec = 0;
    let shiftLines = fs.readFileSync(textFile, "utf8").split(/\r?\n/);
    let targetMonth = parseInt(month, 10);
    let daysArr =["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 0; i < shiftLines.length; i++) {
        if (shiftLines[i].trim() === "") continue;
        let columns = shiftLines[i].split(",");
        if (columns[0].trim() === driverID) {
            let recordDate = columns[2].trim();
            let dateParts = recordDate.split("-");
            let recordMonth = parseInt(dateParts[1], 10);

            if (recordMonth === targetMonth) {
                let d = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
                let weekdayName = daysArr[d.getUTCDay()];

                if (weekdayName !== dayOff) {
                    if (recordDate >= "2025-04-10" && recordDate <= "2025-04-30") {
                        totalRequiredSec += (6 * 3600);
                    } else {
                        totalRequiredSec += (8 * 3600) + (24 * 60);
                    }
                }
            }
        }
    }

    totalRequiredSec -= (bonusCount * 2 * 3600);
    if (totalRequiredSec < 0) totalRequiredSec = 0;

    return secondsToTimeString(totalRequiredSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let actualSec = timeToSeconds(actualHours);
    let reqSec = timeToSeconds(requiredHours);
    let missingSec = reqSec - actualSec;
    if (missingSec <= 0) missingSec = 0;

    let basePay = 0;
    let tier = 0;

    if (fs.existsSync(rateFile)) {
        let lines = fs.readFileSync(rateFile, "utf8").split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === "") continue;
            let columns = lines[i].split(",");
            if (columns[0].trim() === driverID) {
                basePay = parseInt(columns[2].trim(), 10);
                tier = parseInt(columns[3].trim(), 10);
                break;
            }
        }
    }

    let allowanceHours = 0;
    if (tier === 1) allowanceHours = 50;
    else if (tier === 2) allowanceHours = 20;
    else if (tier === 3) allowanceHours = 10;
    else if (tier === 4) allowanceHours = 3;

    let billableMissingSec = missingSec - (allowanceHours * 3600);
    if (billableMissingSec <= 0) billableMissingSec = 0;

    let billableMissingHours = Math.floor(billableMissingSec / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);

    return Math.max(0, basePay - (billableMissingHours * deductionRatePerHour));
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};