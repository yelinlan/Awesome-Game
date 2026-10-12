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
      // 正常 normal 困难 hard 疯狂 crazy 地狱 hell
      defaultMode: "crazy", // 默认难度
      level: SWEEP.level, // 侧边栏
      buttonList: SWEEP.buttonList, // 按钮列表
      boardSize: [0, 0], // 棋盘尺寸
      mineCount: 0, // 雷的数量
      minePos: [], // 雷的坐标集合
      boardData: [], // 棋盘数据
      gameIsOver: false, // 记录游戏是否结束
      elapsedTime: 0, // 开始游戏耗时
      elapsedTimer: null, // 游戏计时器
      msg: "主人~，要加油哦！",
      startSchedule: false,
      scheduleId: null,
      neighborCache: {},
    };
  },
  created() {
    // 1.通过难度初始化数据
    this.setInitMode();
    // 2.通过数据初始化棋盘
    this.initBoard();
  },
  beforeUnmount() {
    clearInterval(this.elapsedTimer);
    clearInterval(this.scheduleId);
    document.onkeydown = null;
  },
  computed: {
    /**
     * 剩余雷的数量
     * @return {number}
     */
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
    /**
     * 设置初始难度，雷，棋盘样式
     * @param {void}
     * @returns {void}
     */
    setInitMode() {
      const {modeEnum} = SWEEP;
      const {defaultMode} = this;
      this.boardSize = [...modeEnum[defaultMode].boardSize];
      this.mineCount = modeEnum[defaultMode].mineCount;
    },

    /**
     * 游戏胜利
     * @param {void}
     * @returns {void}
     */
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
      clearInterval(this.elapsedTimer);
      clearInterval(this.scheduleId);
      this.startSchedule = false;
      this.scheduleId = null;
      this.elapsedTimer = null;
    },

    /**
     * 初始化棋盘
     * @param {void}
     * @returns {void}
     */
    initBoard() {
      this.msg = "主人~，要加油哦！";
      clearInterval(this.scheduleId);
      this.startSchedule = false;
      this.scheduleId = null;
      this.neighborCache = {};

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
      this.creatMine();
      this.initElapsedTime();
    },

    /**
     * 重新开始游戏
     * @param {void}
     * @returns {void}
     */
    restartGame() {
      this.gameIsOver = false;
      this.initBoard();
    },

    /**
     * 初始化游戏时间
     * @param {void}
     * @returns {void}
     */
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

    /**
     * 数字前补 0
     * @param {number}  num 传入的数字
     * @param {number}  n 需要的字符长度
     * @returns {void}
     */
    PrefixInteger(num, n) {
      return (Array(n).join(0) + num).slice(-n);
    },

    /**
     * 计算格子索引
     * @param {array} pos
     * @returns {number}
     */
    calcIdx([x, y]) {
      const row = this.boardSize[0];
      return y * row + x;
    },

    /**
     * 获取指定位置附近的九宫格坐标
     * @param {array} pos
     * @returns {array}
     */
    requestPos([x, y]) {
      const key = `${x},${y}`;
      if (this.neighborCache[key]) {
        return this.neighborCache[key];
      }
      const [maxX, maxY] = this.boardSize;
      const arr = [];
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
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

    /**
     * 随机生成若干雷
     * @param {void}
     * @returns {void}
     */
    creatMine() {
      const {boardData, mineCount, boardSize: [width, height]} = this;
      const total = width * height;
      const randomSet = new Set();

      while (randomSet.size < mineCount) {
        randomSet.add(Math.floor(Math.random() * total));
      }

      const minePos = [];
      randomSet.forEach((index) => {
        const item = boardData[index];
        if (!item) {
          return;
        }
        item.type = "mine";
        minePos.push(item.pos);
      });

      this.minePos = minePos;
      this.calcMineForNumber();
    },

    /**
     * 计算格子周围有多少雷
     * @param {void}
     * @returns {void}
     */
    calcMineForNumber() {
      const {boardData, minePos} = this;
      const mineSet = new Set(minePos.map(([x, y]) => `${x},${y}`));

      boardData.forEach((item) => {
        if (item.type !== "init") {
          return;
        }

        let count = 0;
        const sudoku = this.requestPos(item.pos);
        sudoku.forEach(([posX, posY]) => {
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

    /**
     * 点击插旗子
     * @param {array}
     * @return {number}
     */
    insertFlag(item) {
      this.insertOneFlag(item);
      this.autoPick();
    },

    /**
     * 点击棋盘扫雷
     * @param {object}
     * @returns {void}
     */
    clickBoard(e, item) {
      const {gameIsOver} = this;
      if (gameIsOver) return;
      if (item.isFlag) return;
      if (e.button !== 0) return;

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
          this.gameOver({
            notArr: [item.pos],
          });
          break;
        default:
          break;
      }
    },

    /**
     * 用户点击数字
     * @param {object}
     * @returns {void}
     */
    pickNumber(item) {
      this.tipUserSudoForPos(item);
      document.onmouseup = () => {
        document.onmouseup = null;
      };
    },

    /**
     * 用户点击数字提示用户九宫格
     * @param {object}
     * @returns {void}
     */
    tipUserSudoForPos({number: mineNumb, pos}) {
      const {boardData} = this;
      let flagCount = 0;
      const mineArr = [];
      const flagArr = [];
      const sudoku = this.requestPos(pos);

      sudoku.forEach(([x, y]) => {
        const cell = boardData[this.calcIdx([x, y])];
        if (!cell) {
          return;
        }
        if (cell.type === "mine") {
          mineArr.push(cell.pos);
        }
        if (cell.isFlag) {
          flagCount += 1;
          flagArr.push(cell.pos);
        }
      });

      if (flagCount >= mineNumb) {
        const {bool, notArr, errorArr} = this.findMine({
          mineArr,
          flagArr,
        });
        if (bool) {
          this.handleSpace(pos);
        } else {
          this.gameOver({notArr, errorArr});
        }
      }
    },

    /**
     * 游戏结束
     * @param {object}
     * @returns {void}
     */
    gameOver({notArr = [], errorArr = []}) {
      this.gameIsOver = true;
      const {boardData} = this;

      boardData.forEach((item) => {
        item.isCheck = true;
        item.isFlag = false;
      });

      notArr.forEach((pos) => {
        const idx = this.calcIdx(pos);
        if (boardData[idx]) {
          boardData[idx].type = "mineSuccess";
        }
      });

      errorArr.forEach((pos) => {
        const idx = this.calcIdx(pos);
        if (boardData[idx]) {
          boardData[idx].type = "mineError";
        }
      });

      this.msg = "喵~，主人~ 要认真一点哦~";
      clearInterval(this.elapsedTimer);
      clearInterval(this.scheduleId);
      this.startSchedule = false;
      this.scheduleId = null;
      this.elapsedTimer = null;
    },

    /**
     * 比较数组返回雷的坐标集合
     * @param {object}
     * @return {object}
     */
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
        const cell = this.boardData[this.calcIdx(flagPos)];
        if (cell && cell.type !== "mine") {
          errorArr.push(flagPos);
        }
        if (!mineSet.has(key)) {
          errorArr.push(flagPos);
        }
      });

      mineArr.forEach((minePos) => {
        const key = `${minePos[0]},${minePos[1]}`;
        if (!flagSet.has(key)) {
          notArr.push(minePos);
        }
      });

      return {
        bool: false,
        notArr,
        errorArr,
      };
    },

    /**
     * 点击空白处递归方法
     * @param {array}
     * @returns {void}
     */
    handleSpace(startPos) {
      const {boardData} = this;
      const queue = [startPos];
      const visited = new Set();

      while (queue.length > 0) {
        const currentPos = queue.shift();
        const key = `${currentPos[0]},${currentPos[1]}`;
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);

        const item = boardData[this.calcIdx(currentPos)];
        if (!item || item.type === "mine") {
          continue;
        }

        if (!item.isCheck) {
          item.isCheck = true;
          item.isFlag = false;
        }

        if (item.type === "number") {
          continue;
        }

        if (item.type === "null") {
          this.requestPos(currentPos).forEach(([nextX, nextY]) => {
            const neighbor = boardData[this.calcIdx([nextX, nextY])];
            if (!neighbor || neighbor.type === "mine") {
              return;
            }
            if (!neighbor.isCheck) {
              queue.push([nextX, nextY]);
            }
          });
        }
      }
    },

    /**
     * 选择难度
     * @param {object}
     * @returns {void}
     */
    pickDifficulty({mode}) {
      const {modeEnum} = SWEEP;
      this.gameIsOver = false;
      this.defaultMode = mode;
      this.boardSize = [...modeEnum[mode].boardSize];
      this.mineCount = modeEnum[mode].mineCount;
      this.initBoard();
    },

    /**
     * 给数字添加颜色
     * @param {number}
     * @return {object}
     */
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

    /**
     * 自动点击
     * @param {void}
     * @returns {void}
     */
    autoPick() {
      const {boardData} = this;
      boardData.forEach((item) => {
        if (item.type === "number" && item.isCheck && !item.isFlag) {
          this.pickNumber(item);
          this.autoMark(item);
        }
      });
    },

    /**
     * 自动自动标记
     * @param {void}
     * @returns {void}
     */
    autoMark(item) {
      if (item.type !== "number") {
        return;
      }

      const hiddenNeighbors = this.calcNumber(item.pos).filter((cell) => !cell.isFlag && !cell.isCheck);
      if (hiddenNeighbors.length === 0) {
        return;
      }

      if (item.number === hiddenNeighbors.length) {
        hiddenNeighbors.forEach((cell) => {
          if (!cell.isCheck && !cell.isFlag) {
            this.insertOneFlag(cell);
          }
        });
      }
    },

    /**
     * 右键插旗子
     * @param {item}
     * @return {number}
     */
    insertOneFlag(item) {
      const {boardData, mineCount} = this;
      if (item.isCheck) {
        item.isFlag = false;
        return;
      }

      item.isFlag = !item.isFlag;

      const correctFlag = boardData.reduce((c, i) => {
        if (i.isFlag && i.type === "mine") {
          return c + 1;
        }
        return c;
      }, 0);

      if (correctFlag === mineCount) {
        this.gameWin();
      }
    },

    /**
     * 计算格子周围没有点开的雷的数量
     * @param {pos}
     * @returns {void}
     */
    calcNumber(pos) {
      const {boardData} = this;
      const nodes = [];

      this.requestPos(pos).forEach((p) => {
        const cell = boardData[this.calcIdx(p)];
        if (cell && !cell.isCheck) {
          nodes.push(cell);
        }
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
