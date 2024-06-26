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
      scheduleId: null
    };
  },
  created() {
    // 1.通过难度初始化数据
    this.setInitMode();
    // 2.通过数据初始化棋盘
    this.initBoard();
  },
  mounted() {
  },
  destroyed() {
    clearInterval(this.elapsedTimer);
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
      this.boardSize = modeEnum[defaultMode].boardSize;
      this.mineCount = modeEnum[defaultMode].mineCount;
    },

    /**
     * 游戏胜利
     * @param {void}
     * @returns {void}
     */
    gameWin() {
      const {boardData} = this;
      boardData.map((item) => {
        item.isCheck = true;
        item.isFlag = false;
        if (item.type == "mine") {
          item.type = "mineSuccess";
        }
      });
      this.msg = "喵~，主人~ 真棒~"
      // 3.0 清楚游戏时间定时器
      clearInterval(this.elapsedTimer);
      clearInterval(this.scheduleId)
      this.startSchedule = false
      this.elapsedTimer = null;
    },

    /**
     * 初始化棋盘
     * @param {void}
     * @returns {void}
     */
    initBoard() {
      this.msg = "主人~，要加油哦！"
      clearInterval(this.scheduleId)
      this.startSchedule = false
      // 1.0 初始化棋盘
      const [x, y] = this.boardSize;
      const afterArr = [];
      for (let i = 0; i < y; i++) {
        for (let j = 0; j < x; j++) {
          const item = {
            type: "init", // 设置初始属性
            isCheck: false, // 是否点击过
            pos: [j, i], // 格子的坐标
            isRepeat: "not", // 是否递归过
            isFlag: false, // 用户是否插了旗子
          };
          afterArr.push(item);
        }
      }
      this.boardData = afterArr;
      // 2.0 初始化雷
      this.creatMine();
      // 3.0 初始化游戏时间
      this.initElapsedTime();
    },

    /**
     * 重新开始游戏
     * @param {void}
     * @returns {void}
     */
    restartGame() {
      this.gameIsOver = false;
      // 初始化棋盘
      this.initBoard();
    },

    /**
     * 初始化游戏时间
     * @param {void}
     * @returns {void}
     */
    initElapsedTime() {
      const startTime = moment();
      // 初始化时间
      clearInterval(this.elapsedTimer);
      this.elapsedTime = "00:00:00";
      this.elapsedTimer = setInterval(() => {
        const currentTime = moment();
        const du = moment.duration(currentTime - startTime, "ms");
        const hours = du.get("hours");
        const mins = du.get("minutes");
        const ss = du.get("seconds");
        const formatDate =
            this.PrefixInteger(hours, 2) +
            ":" +
            this.PrefixInteger(mins, 2) +
            ":" +
            this.PrefixInteger(ss, 2);
        this.elapsedTime = formatDate;
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
     * 随机生成若干雷
     * @param {void}
     * @returns {void}
     */
    creatMine() {
      const {
        mineCount, // 雷的数量
        boardData, // 棋盘数据
        boardSize: [a, b], // 随机最大值
      } = this;
      let i = 0;
      // 1.0 获取不重复的随机数组
      const randomArr = [];
      while (i < mineCount) {
        const ran = parseInt(Math.random() * a * b);
        let l = randomArr.length;
        let bool = false; // 判断重复布尔值
        if (l) {
          for (let n = 0; n < l; n++) {
            // 重复则重新随机
            if (ran == randomArr[n]) {
              bool = true;
              break;
            }
          }
        }
        if (!bool) {
          randomArr.push(ran);
          i++;
        }
      }
      let minePos = [];
      // 2.0 新增雷到棋盘数据
      randomArr.map((item) => {
        boardData[item].type = "mine";
        // 3.0 记录雷的坐标
        minePos.push(boardData[item].pos);
      });
      this.minePos = minePos;
      // 4.0 计算每个格子雷的数量
      this.calcMineForNumber();
    },

    /**
     * 计算格子周围有多少雷
     * @param {void}
     * @returns {void}
     */
    calcMineForNumber() {
      const {boardData, minePos} = this;
      boardData.map((item) => {
        let count = 0; // 记录当前格子周边雷的数量
        const sudoku = this.requestPos(item.pos);
        sudoku.map((sudo) => {
          minePos.map((mine) => {
            // 相同则记录一次雷的数量
            if (sudo[0] == mine[0] && sudo[1] == mine[1]) {
              count++;
            }
          });
        });
        // 只有为初始值的时候才改变
        if (item.type == "init") {
          if (count == 0) {
            item.type = "null";
          } else {
            item.type = "number";
            item.number = count;
            item.styles = this.handleInsertColors(count);
          }
        }
      });
    },

    /**
     * 点击插旗子
     * @param {array}
     * @return {number}
     */
    insertFlag(item) {
      this.insertOneFlag(item)
      this.autoPick()
    },

    /**
     * 根据坐标计算索引
     * @param {array}
     * @return {number}
     */
    calcIdx([a, b]) {
      const row = this.boardSize[0];
      return b * row + a;
    },

    /**
     * 点击棋盘扫雷
     * @param {object}
     * @returns {void}
     */
    clickBoard(e, item) {
      const {gameIsOver} = this;
      // 游戏结束则不执行则返回
      if (gameIsOver) return;
      // 如果点击格子已被插旗 则不允许执行操作 立即返回
      if (item.isFlag) return;
      // 只执行鼠标左键按下事件
      if (e.button != 0) return;
      item.isCheck = true;
      switch (item.type) {
          // 空类型棋格
        case "null":
          this.handleSpace(item.pos);
          this.autoPick();
          break;
          // 数字类型棋格
        case "number":
          this.autoPick();
          break;
          // 雷类型棋格
        case "mine":
          this.gameOver({item});
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
      document.onmouseup = () => document.onmouseup = null;
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
      // 1.0 计算出九宫格的数组（二维）
      const sudoku = this.requestPos(pos);
      for (let i = 0; i < sudoku.length; i++) {
        // 2.0 根据坐标拿到索引 拿到对应的item
        const idx = this.calcIdx(sudoku[i]);
        const item = boardData[idx];
        // 4.0 记录雷的集合与旗子集合
        if (item.type == "mine") {
          mineArr.push(item.pos);
        }
        if (item.isFlag) {
          flagCount++;
          flagArr.push(item.pos);
        }
      }
      // 5.0 旗子数量大于等于雷的数的时候则比较
      if (flagCount >= mineNumb) {
        // 6.0 正确则递归 错误则返回错误雷和未排雷
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
      // 1.0 记录游戏结束结束点击事件
      this.gameIsOver = true;
      const {boardData} = this;
      // 2.0 游戏结束显示所有格子
      boardData.map((item) => {
        item.isCheck = true;
        item.isFlag = false;
      });
      for (let i = 0; i < notArr.length; i++) {
        const idx = this.calcIdx(notArr[i]);
        boardData[idx].type = "mineSuccess";
      }
      for (let i = 0; i < errorArr.length; i++) {
        const idx = this.calcIdx(errorArr[i]);
        boardData[idx].type = "mineError";
      }
      this.msg = "喵~，主人~ 要认真一点哦~"
      // 3.0 清楚游戏时间定时器
      clearInterval(this.elapsedTimer);
      clearInterval(this.scheduleId)
      this.startSchedule = false
      this.elapsedTimer = null;
    },

    /**
     * 比较数组返回雷的坐标集合
     * @param {object}
     * @return {object}
     */
    findMine({flagArr, mineArr}) {
      const {boardData} = this;
      const notArr = [];
      const errorArr = [];
      // 排雷正确则返回 错误则返回坐标集合
      if (JSON.stringify(flagArr) == JSON.stringify(mineArr)) {
        return {
          bool: true,
        };
      } else {
        for (let i = 0; i < flagArr.length; i++) {
          const flagPos = flagArr[i];
          for (let j = 0; j < mineArr.length; j++) {
            const minePos = mineArr[j];
            // 1.0 旗子所在棋格没有雷则记录错误雷坐标
            const falg = boardData[this.calcIdx(flagPos)];
            if (falg.type != "mine") {
              errorArr.push(flagPos);
            }
            // 2.0 雷的坐标如果没有旗子 则记录未插旗
            const mine = boardData[this.calcIdx(minePos)];
            if (mine.isFlag) {
              notArr.push(minePos);
            }
          }
        }
        return {
          bool: false,
          notArr,
          errorArr,
        };
      }
    },

    /**
     * 点击空白处递归方法
     * @param {array}
     * @returns {void}
     */
    handleSpace(arr) {
      const {boardData} = this;
      // 1.0 计算出九宫格的数组（二维）
      const sudoku = this.requestPos(arr);
      for (let i = 0; i < sudoku.length; i++) {
        // 2.0 根据坐标拿到索引 拿到对应的item
        const idx = this.calcIdx(sudoku[i]);
        const item = boardData[idx];
        // 3.0 根据索引找到的item为undefined则跳过
        if (item == undefined) {
          continue;
        }
        // 4.0 判断是否已经递归过
        if (item.isRepeat === "not") {
          item.isRepeat = "is";
          // 5.0 不为雷的时候才让其显示
          if (item.type !== "mine") {
            item.isCheck = true;
            item.isFlag = false;
          }
          // 6.0 如果为数字则跳出当前轮循环
          if (item.type === "number") {
            continue;
          }
          // 7.0 如果为空白格则向外扩散递归
          if (item.type === "null") {
            this.handleSpace(item.pos);
          }
        }
      }
    },

    /**
     * 传入坐标返回九宫格的二维数组
     * @param {array}
     * @return {array}
     */
    requestPos([x, y]) {
      const [maxX, maxY] = this.boardSize;
      const arr = [
        // 获取九宫格数据
        [x - 1, y - 1], // 左上
        [x, y - 1], // 中上
        [x + 1, y - 1], // 右上
        [x - 1, y], // 中左
        [x + 1, y], // 中右
        [x - 1, y + 1], // 左下
        [x, y + 1], // 中下
        [x + 1, y + 1], // 右下
      ];
      // 1.0 过滤掉边界外的坐标
      const filterArr = arr.filter(
          ([posX, posY]) =>
              !(posX < 0 || posY < 0 || posX >= maxX || posY >= maxY)
      );
      return filterArr;
    },

    /**
     * 选择难度
     * @param {object}
     * @returns {void}
     */
    pickDifficulty({mode, label}) {
      const {modeEnum} = SWEEP;
      // 游戏配置重新开始参数
      this.gameIsOver = false;
      this.defaultMode = mode;

      // 通过枚举设置棋盘属性
      this.boardSize = modeEnum[mode].boardSize;
      this.mineCount = modeEnum[mode].mineCount;
      const type = modeEnum[mode].type;
      this.initBoard();
    },

    /**
     * 给数字添加颜色
     * @param {number}
     * @return {object}
     */
    handleInsertColors(i) {
      let obj = {};
      switch (i) {
        case 1:
          obj.color = "rgb(226, 172, 172)";
          break;
        case 2:
          obj.color = "rgb(187, 134, 115)";
          break;
        case 3:
          obj.color = "rgb(221, 203, 144)";
          break;
        case 4:
          obj.color = "rgb(196, 206, 152)";
          break;
        case 5:
          obj.color = "rgb(113, 173, 116)";
          break;
        case 6:
          obj.color = "rgb(105, 189, 185)";
          break;
        case 7:
          obj.color = "rgb(107, 122, 155)";
          break;
        case 8:
          obj.color = "rgb(155, 94, 145)";
          break;
        case 9:
          obj.color = "rgb(192, 87, 101)";
          break;
      }
      return obj;
    },
    /**
     * 自动点击
     * @param {void}
     * @returns {void}
     */
    autoPick() {
      const {boardData} = this;
      boardData.map((item) => {
        if (item.type === "number" && item.isCheck === true && item.isFlag === false) {
          this.pickNumber(item)
          this.autoMark(item)
        }
      });
    },

    /**
     * 自动自动标记
     * @param {void}
     * @returns {void}
     */
    autoMark(item) {
      if (item.type == "number") {
        var m = this.calcNumber(item.pos)
        if (item.number == m.length) {
          m.map((i) => {
            if (!i.isFlag) {
              //加自动插旗定时器
              if (!this.startSchedule) {
                console.log("创自动插旗定时器")
                this.scheduleId = setInterval(() => this.insertFlag(i), 100)
                this.startSchedule = true
              }
              this.insertOneFlag(i)
            }
          });
        }
      }
    },

    /**
     * 右键插旗子
     * @param {item}
     * @return {number}
     */
    insertOneFlag(item) {
      const {boardData, mineCount} = this;
      // 已经被点击过的盒子 不能插旗子
      if (item.isCheck) {
        item.isFlag = false;
        return;
      }
      item.isFlag = !item.isFlag;
      // 检查是否取得胜利
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
      const m = [];
      const {boardData} = this;
      this.requestPos(pos).map((p) => {
        const mine = boardData[this.calcIdx(p)];
        if (!mine.isCheck) {
          m.push(mine)
        }
      });
      return m;
    },

  },
};
</script>

<style lang="scss" scoped>
@import "@/assets/css/sweep.scss";
@import "@/assets/css/paper.css";
@import "@/assets/css/alan.css";
</style>
