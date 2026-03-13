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
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
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
    // TODO: Implement this function
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
    // TODO: Implement this function
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