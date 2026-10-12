<template>
  <div>
    <div class="row site w1440">
      <div
          class="sm-12 md-12 col"
      >
        <div class="paper">
          <div class="right_top">
            <div class="row child-borders cont_btn">
              <div class="paper_li" @click="restartGame()">重新开始 (RESTART)</div>
              <div
                  class="paper_li"
                  v-for="(child, cIdx) in level"
                  :key="cIdx"
                  @click="pickDifficulty(child)"
              > {{ child.label }}
              </div>
            </div>
            <div class="mine_tip">
              <span>{{ `剩余 X ${theRestOfMine}` }}</span>
              <img
                  class="mine_img"
                  src="../../assets/img/sweep/mineTransparent.png"
                  alt/>
            </div>
            <div class="user-date">已用时：{{ elapsedTime }}</div>
            <div class="user-date">结果：{{ msg }}</div>
          </div>
          <div class="board cl" :class="`${defaultMode}_board`">
            <div
                v-for="(item, idx) in boardData"
                :key="idx"
                :style="item.styles"
                :class="{
                  [item.type]: true,
                  isCheck: !item.isCheck,
                  flag: item.isFlag,
                }"
                class="sigleCheck"
                @contextmenu.prevent="insertFlag(item)"
                @mousedown="clickBoard($event, item)"
            >
              {{ item.isCheck ? item.number : "" }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import * as SWEEP from "@/constants/sweep.js";

export default {
  data() {
    return {
      defaultMode: "crazy",
      level: SWEEP.level,
      buttonList: SWEEP.buttonList,
      boardSize: [0, 0],
      mineCount: 0,
      minePos: [],
      boardData: [],
      gameIsOver: false,
      elapsedTime: 0,
      elapsedTimer: null,
      msg: "主人~，要加油哦！",
      startSchedule: false,
      scheduleId: null,
      neighborCache: {},
      firstMoveDone: false,
    };
  },
  created() {
    this.setInitMode();
    this.initBoard();
  },
  beforeUnmount() {
    this.clearGameTimers();
    document.onkeydown = null;
  },
  computed: {
    theRestOfMine() {
      const {boardData, mineCount} = this;
      const count = boardData.reduce((c, i) => {
        if (i.isFlag) {
          return c - 1;
        }
        return c;
      }, mineCount);
      return count < 0 ? 0 : count;
    },
  },
  methods: {
    clearGameTimers() {
      clearInterval(this.elapsedTimer);
      clearInterval(this.scheduleId);
      this.startSchedule = false;
      this.scheduleId = null;
      this.elapsedTimer = null;
    },

    getCellAt(pos) {
      const idx = this.calcIdx(pos);
      return this.boardData[idx];
    },

    setInitMode() {
      const {modeEnum} = SWEEP;
      const {defaultMode} = this;
      this.boardSize = [...modeEnum[defaultMode].boardSize];
      this.mineCount = modeEnum[defaultMode].mineCount;
    },

    gameWin() {
      const {boardData} = this;
      boardData.forEach((item) => {
        item.isCheck = true;
        item.isFlag = false;
        if (item.type === "mine") {
          item.type = "mineSuccess";
        }
      });
      this.msg = "喵~，主人~ 真棒~";
      this.clearGameTimers();
    },

    initBoard() {
      this.msg = "主人~，要加油哦！";
      this.clearGameTimers();
      this.neighborCache = {};
      this.firstMoveDone = false;

      const [x, y] = this.boardSize;
      const afterArr = [];
      for (let i = 0; i < y; i++) {
        for (let j = 0; j < x; j++) {
          afterArr.push({
            type: "init",
            isCheck: false,
            pos: [j, i],
            isRepeat: "not",
            isFlag: false,
            number: 0,
            styles: {},
          });
        }
      }
      this.boardData = afterArr;
      this.minePos = [];
      this.initElapsedTime();
    },

    restartGame() {
      this.gameIsOver = false;
      this.initBoard();
    },

    initElapsedTime() {
      const startTime = moment();
      clearInterval(this.elapsedTimer);
      this.elapsedTime = "00:00:00";
      this.elapsedTimer = setInterval(() => {
        const currentTime = moment();
        const diff = currentTime.diff(startTime, "ms");
        const duration = moment.duration(diff, "ms");
        const hours = duration.get("hours");
        const mins = duration.get("minutes");
        const secs = duration.get("seconds");
        this.elapsedTime = [
          this.PrefixInteger(hours, 2),
          this.PrefixInteger(mins, 2),
          this.PrefixInteger(secs, 2),
        ].join(":");
      }, 1000);
    },

    PrefixInteger(num, n) {
      return (Array(n).join(0) + num).slice(-n);
    },

    calcIdx([x, y]) {
      const row = this.boardSize[0];
      return y * row + x;
    },

    requestPos([x, y]) {
      const key = `${x},${y}`;
      if (this.neighborCache[key]) {
        return this.neighborCache[key];
      }
      const [maxX, maxY] = this.boardSize;
      const arr = [];
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX >= 0 && nextX < maxX && nextY >= 0 && nextY < maxY) {
            arr.push([nextX, nextY]);
          }
        }
      }
      this.neighborCache[key] = arr;
      return arr;
    },

    generateMines(excludedPos = null) {
      const {boardData, mineCount, boardSize: [width, height]} = this;
      const total = width * height;
      const excludedKey = excludedPos ? `${excludedPos[0]},${excludedPos[1]}` : null;
      const indexes = [];
      for (let i = 0; i < total; i++) {
        const pos = [i % width, Math.floor(i / width)];
        const key = `${pos[0]},${pos[1]}`;
        if (excludedKey && key === excludedKey) continue;
        indexes.push(i);
      }

      for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
      }

      const mineIndexes = indexes.slice(0, mineCount);
      const mineSet = new Set(mineIndexes);
      const minePos = [];

      boardData.forEach((item, index) => {
        item.type = mineSet.has(index) ? "mine" : item.type;
        if (mineSet.has(index)) {
          minePos.push(item.pos);
        }
      });

      this.minePos = minePos;
      this.calcMineForNumber();
    },

    calcMineForNumber() {
      const {boardData, minePos} = this;
      const mineSet = new Set(minePos.map(([x, y]) => `${x},${y}`));

      boardData.forEach((item) => {
        if (item.type !== "init") {
          return;
        }

        let count = 0;
        this.requestPos(item.pos).forEach(([posX, posY]) => {
          if (mineSet.has(`${posX},${posY}`)) {
            count += 1;
          }
        });

        if (count === 0) {
          item.type = "null";
        } else {
          item.type = "number";
          item.number = count;
          item.styles = this.handleInsertColors(count);
        }
      });
    },

    insertFlag(item) {
      this.insertOneFlag(item);
      this.autoPick();
    },

    calcIdx([x, y]) {
      const row = this.boardSize[0];
      return y * row + x;
    },

    clickBoard(e, item) {
      const {gameIsOver} = this;
      if (gameIsOver) return;
      if (item.isFlag) return;
      if (e.button !== 0) return;

      if (!this.firstMoveDone) {
        this.firstMoveDone = true;
        this.generateMines(item.pos);
      }

      item.isCheck = true;
      switch (item.type) {
        case "null":
          this.handleSpace(item.pos);
          this.autoPick();
          break;
        case "number":
          this.autoPick();
          break;
        case "mine":
          this.gameOver({notArr: [item.pos]});
          break;
      }
    },

    pickNumber(item) {
      this.tipUserSudoForPos(item);
      document.onmouseup = () => {
        document.onmouseup = null;
      };
    },

    tipUserSudoForPos({number: mineNumb, pos}) {
      const {boardData} = this;
      let flagCount = 0;
      const mineArr = [];
      const flagArr = [];
      const sudoku = this.requestPos(pos);

      sudoku.forEach(([x, y]) => {
        const cell = this.getCellAt([x, y]);
        if (!cell) return;
        if (cell.type === "mine") mineArr.push(cell.pos);
        if (cell.isFlag) {
          flagCount += 1;
          flagArr.push(cell.pos);
        }
      });

      if (flagCount >= mineNumb) {
        const {bool, notArr, errorArr} = this.findMine({mineArr, flagArr});
        if (bool) {
          this.handleSpace(pos);
        } else {
          this.gameOver({notArr, errorArr});
        }
      }
    },

    gameOver({notArr = [], errorArr = []}) {
      this.gameIsOver = true;
      const {boardData} = this;

      boardData.forEach((item) => {
        item.isCheck = true;
        item.isFlag = false;
      });

      notArr.forEach((pos) => {
        const idx = this.calcIdx(pos);
        if (boardData[idx]) boardData[idx].type = "mineSuccess";
      });

      errorArr.forEach((pos) => {
        const idx = this.calcIdx(pos);
        if (boardData[idx]) boardData[idx].type = "mineError";
      });

      this.msg = "喵~，主人~ 要认真一点哦~";
      this.clearGameTimers();
    },

    findMine({flagArr, mineArr}) {
      const flagSet = new Set(flagArr.map(([x, y]) => `${x},${y}`));
      const mineSet = new Set(mineArr.map(([x, y]) => `${x},${y}`));

      if (flagSet.size === mineSet.size && [...flagSet].every((key) => mineSet.has(key))) {
        return {bool: true};
      }

      const notArr = [];
      const errorArr = [];

      flagArr.forEach((flagPos) => {
        const key = `${flagPos[0]},${flagPos[1]}`;
        const cell = this.getCellAt(flagPos);
        if (cell && cell.type !== "mine") errorArr.push(flagPos);
        if (!mineSet.has(key)) errorArr.push(flagPos);
      });

      mineArr.forEach((minePos) => {
        const key = `${minePos[0]},${minePos[1]}`;
        if (!flagSet.has(key)) notArr.push(minePos);
      });

      return {bool: false, notArr, errorArr};
    },

    handleSpace(startPos) {
      const {boardData} = this;
      const queue = [startPos];
      const visited = new Set();

      while (queue.length > 0) {
        const currentPos = queue.shift();
        const key = `${currentPos[0]},${currentPos[1]}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const item = this.getCellAt(currentPos);
        if (!item || item.type === "mine") continue;

        if (!item.isCheck) {
          item.isCheck = true;
          item.isFlag = false;
        }

        if (item.type === "number") continue;

        if (item.type === "null") {
          this.requestPos(currentPos).forEach(([nextX, nextY]) => {
            const neighbor = this.getCellAt([nextX, nextY]);
            if (!neighbor || neighbor.type === "mine") return;
            if (!neighbor.isCheck) queue.push([nextX, nextY]);
          });
        }
      }
    },

    pickDifficulty({mode}) {
      const {modeEnum} = SWEEP;
      this.gameIsOver = false;
      this.defaultMode = mode;
      this.boardSize = [...modeEnum[mode].boardSize];
      this.mineCount = modeEnum[mode].mineCount;
      this.initBoard();
    },

    handleInsertColors(i) {
      const colorMap = {
        1: "rgb(226, 172, 172)",
        2: "rgb(187, 134, 115)",
        3: "rgb(221, 203, 144)",
        4: "rgb(196, 206, 152)",
        5: "rgb(113, 173, 116)",
        6: "rgb(105, 189, 185)",
        7: "rgb(107, 122, 155)",
        8: "rgb(155, 94, 145)",
        9: "rgb(192, 87, 101)",
      };
      return {color: colorMap[i] || "rgb(226, 172, 172)"};
    },

    autoPick() {
      const {boardData} = this;
      boardData.forEach((item) => {
        if (item.type === "number" && item.isCheck && !item.isFlag) {
          this.pickNumber(item);
          this.autoMark(item);
        }
      });
    },

    autoMark(item) {
      if (item.type !== "number") return;
      const hiddenNeighbors = this.calcNumber(item.pos).filter((cell) => !cell.isFlag && !cell.isCheck);
      if (hiddenNeighbors.length === 0) return;
      if (item.number === hiddenNeighbors.length) {
        hiddenNeighbors.forEach((cell) => {
          if (!cell.isCheck && !cell.isFlag) this.insertOneFlag(cell);
        });
      }
    },

    insertOneFlag(item) {
      const {boardData, mineCount} = this;
      if (item.isCheck) {
        item.isFlag = false;
        return;
      }

      item.isFlag = !item.isFlag;
      const correctFlag = boardData.reduce((c, i) => {
        if (i.isFlag && i.type === "mine") return c + 1;
        return c;
      }, 0);

      if (correctFlag === mineCount) {
        this.gameWin();
      }
    },

    calcNumber(pos) {
      const {boardData} = this;
      const nodes = [];
      this.requestPos(pos).forEach((p) => {
        const cell = boardData[this.calcIdx(p)];
        if (cell && !cell.isCheck) nodes.push(cell);
      });
      return nodes;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "@/assets/css/sweep.scss";
@import "@/assets/css/paper.css";
@import "@/assets/css/alan.css";
</style>
