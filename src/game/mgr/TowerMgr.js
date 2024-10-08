import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
import PalaceMgr from "#game/mgr/PalaceMgr.js";
import PlayerAttributeMgr from "./PlayerAttributeMgr.js";

export default class TowerMgr {
    constructor() {
        this.isSyncing = false;
        this.isProcessing = false;
        this.data = {};
        this.hasReward = false;
        this.challenge = global.account.switch.challenge;
        this.showResult = global.account.switch.showResult || false;
        this.challengeSuccessReset = global.account.switch.challengeSuccessReset || false;

        LoopMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new TowerMgr();
        }
        return this._instance;
    }

    clear() {
        LoopMgr.inst.remove(this);
    }

    SyncData(t) {
        this.isSyncing = true;
        this.data = t || {};
        if (this.data.curPassId !== 0) {
            logger.info("[镇妖塔管理] 一键选择!!!")
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_SELECT_BUFF, { index: 0, isOneKey: true }, null);
        }
        this.isSyncing = false;
    }

    challengeResult(t) {
        const currentStage = t.towerDataSync.curPassId % 10 === 0 ? 10 : t.towerDataSync.curPassId % 10;
        const isWinText = t.allBattleRecord.isWin == true ? `${global.colors.red}成功${global.colors.reset}` : `${global.colors.yellow}失败${global.colors.reset}`;

        if (this.showResult) {
            logger.info(`[镇妖塔管理] ${isWinText} ${Math.ceil(t.towerDataSync.curPassId / 10)}层${currentStage}关 剩余次数:${this.challenge}`);
        }

        if (currentStage == 10 && t.allBattleRecord.isWin == true) {
            logger.info("[镇妖塔管理] 一键选择!!!")
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_SELECT_BUFF, { index: 0, isOneKey: true }, null);
        }

        if (t.ret === 0) {
            if (t.allBattleRecord.isWin) {
                if (this.challengeSuccessReset) {
                    this.challenge = global.account.switch.challenge;
                }
            }
        }
    }

    processReward() {
        if (this.data.curPassId == 0) {
            // TODO 判断是否已开启仙宫
            // if (!PalaceMgr.inst.checkIsMiracle && PalaceMgr.Enabled) {
            if (!PalaceMgr.inst.checkIsMiracle) {
                return;
            }
            logger.info("[镇妖塔管理] 开始领取镇妖塔奖励");
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_VIEW_SAVE_SELECT, { markPreference: [{ priority: 1, skillType: 1017 }, { priority: 2, skillType: 1018 }, { priority: 3, skillType: 1023 }, { priority: 4, skillType: 1001 }, { priority: 5, skillType: 1022 }] }, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_QUICK_CHANLLENGE, {}, null);
            GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_SELECT_BUFF, { index: 0, isOneKey: true }, null);
            this.hasReward = true;
        }
    }

    async loopUpdate() {
        if (this.isProcessing || this.isSyncing) return;
        this.isProcessing = true;

        try {
            if (this.challenge == 0) {
                this.clear();
                logger.info("[镇妖塔管理] 任务完成停止循环");
                // 任务完成后切换为默认分身
                const defaultIdx = global.account.switch.defaultIndex || 0; //默认分身
                PlayerAttributeMgr.inst.setSeparationIdx(defaultIdx)
            } else {
                //切换到分身
                const idx = global.account.switch.challengeIndex || 0;
                PlayerAttributeMgr.inst.setSeparationIdx(idx)
                //挑战
                GameNetMgr.inst.sendPbMsg(Protocol.S_TOWER_CHALLENGE, { index: 0, isOneKey: true }, null);
                this.challenge--;
                await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
            }

            if (!this.hasReward) {
                this.processReward();
            }
        } catch (error) {
            logger.error(`[镇妖塔管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
