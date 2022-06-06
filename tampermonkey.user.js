// ==UserScript==
// @name         TYPELINE Util
// @namespace    http://tampermonkey.net/
// @version      0.1.7
// @description  TYPELINEの挙動を変えるためのスクリプト
// @author       ogw.tttt@gmail.com
// @include      https://preview.n*v.co.jp/*
// @include      https://dashboard.media.play.jp/*
// @include      https://typeline-test.streaks.jp/*
// @icon         https://www.google.com/s2/favicons?domain=play.jp
// @grant        none
// ==/UserScript==
/**
【機能一覧】
・非本番環境（TYPELINEステージング環境、プレビューサイト）で外観を変更
・横スクロールが必要な表が表示された状態で、Ctrl + (← or →) で端まで移動

[カスタムメニュー]
▼記事
・自分が作成者の記事
・カル・スポ除く
・カルチャー
・スポーツ
▼原稿
・報道原稿
・報道原稿(ニュース編集除く)
・災害･L字原稿

[記事一覧]
・行のどこかをクリックすればチェックが入るように
・チェックを入れたアイテムをCtrl+Enterで一気に開く（※要ポップアップブロック解除）

[記事編集]
・テキスト入力欄のフォントを MS Gothic に（等幅かつクオーテーションの向き判別可能）
・タイトル、サブタイトル、要約の入力欄を強調
・配信先確認を促すボタンの設置、配信先タブを強調（新規作成時と原稿から記事化した直後タイトル未定時に）
・記事作成ページから動画のアップロードボタンを消し去る
・アセット選択画面(画像・動画どちらも)備考欄の表示領域を限定し、備考文字数が多くなっても表を見やすく
・アセット選択画面での備考全体の確認のため、備考欄をCtrl+クリックで備考表示モーダルを表示、モーダルをCtrl+クリックで閉じる
・アセット選択画面で、行のどこかをダブルクリックすれば設定前確認画面（選んで「保存するボタン」を押したのと同じ状態）に
・アセット設定前確認ポップアップでCtrl+Enter or 画面のどこかをダブルクリックで「設定する」をクリックと等価に(アセット設定）
・公開期限設定の便利ボタンを追加
・配信先の「すべてに配信」を除去

[記事詳細=中間画面]
・記事詳細でCtrl+Enter or 画面のどこかをダブルクリックで「記事データの編集」をクリックと等価に（編集画面を開く）

[原稿一覧]
・「原稿タイトルが"NC:"ではじまる」or「使用不可」行をグレーアウト
・行のどこかをクリックすればチェックが入るように
・チェックを入れたアイテムをCtrl+Enterで一気に開く（※要ポップアップブロック解除）

[原稿詳細]
・Ctrl+Enter or 画面のどこかをダブルクリックで「記事化」ボタンのクリックと等価に（ポップアップを開く）
・記事化ポップアップにて Ctrl+Enter or 画面のどこかをダブルクリックで「記事化」をクリックと等価に（記事化の実行）
※「使用不可」もしくは「NC:」の原稿を記事化しようとしたときにアラートを表示するように

[アセット一覧]
・備考欄の表示領域を限定し、備考文字数が多くなっても表を見やすく
・備考全体の確認のため、備考欄をCtrl+クリックで備考表示モーダルを表示、モーダルをCtrl+クリックで閉じる

[アセットアップロード]
・動画ファイルをアップロードできないように
*/
(function() {
  'use strict';

  // プレビューサイトでは外観変更のみ
  if (location.host.indexOf('preview') === 0) {
    const previewStyleEl = document.createElement('style');
    previewStyleEl.appendChild(document.createTextNode(`
header .header-contents {
  background-color: tan;
}

header .header-contents .header-block {
  text-align: center;
}

header .header-contents .header-block [title] a:after {
  content: 'プレビュー';
  color: white;
  font-size: 0.9em;
}
`));
    document.getElementsByTagName('head')[0].appendChild(previewStyleEl);
    return;
  }

  const userStyleEl = document.createElement('style');
  userStyleEl.appendChild(document.createTextNode(`
tr.tlutil-invalid {
  background-color: gainsboro;
}

td.tlutil-note {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tlutil-show-modal td.tlutil-show-note {
  background-color: pink !important;
}

#tlutil-show-note-modal {
  position : absolute;
  z-index: 99999;
  background-color: red;
  display: none;
}

#tlutil-show-note-modal-header {
  position : relative;
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  width: 100%;
  background-color: #f8fafc;
}

#tlutil-show-note-modal-body {
  position : relative;
  background-color: #feeeed;
  border: 5px inset pink;
  padding: 10px;
  height: 100%;
  overflow:auto;
}
`));
  document.getElementsByTagName('head')[0].appendChild(userStyleEl);

  if (location.host !== 'dashboard.media.play.jp') {
    const testStyleEl = document.createElement('style');
    testStyleEl.appendChild(document.createTextNode(`
header.pmpui-top_nav {
  background-color: darkviolet;
}
`));
    document.getElementsByTagName('head')[0].appendChild(testStyleEl);
  }

  function clickManuscriptToArticle() {
    // 原稿詳細で「記事化」ボタンをクリック
    if (location.href.indexOf('/typeline/manuscripts/') > -1) {
      // ポップアップ表示中か否かでクリックすべき「記事化」ボタンが異なる
      // ポップアップ中の「記事化」ボタンを優先処理

      // 「NC原稿」「使用不可」の場合に記事化確認ダイアログ表示
      const unusable = document.querySelector('.pmpui-panel-body').innerText.indexOf('使用不可') > -1;
      const nc = document.querySelector('.pmpui-content__title').innerText.indexOf('NC:') === 0;
      let alertText = '';
      if (unusable) {
        alertText = '「使用不可」の原稿ですが記事化してよろしいですか？';
      } else if (nc) {
        alertText = '「NC:」の原稿ですが記事化してよろしいですか？';
      }

      let buttons = document.querySelectorAll('.MuiDialog-container button');
      if (buttons.length === 0) {
        buttons = document.querySelectorAll('button');
      }
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '記事化') {
          if (alertText !== '' && !confirm(alertText)) {
            return true;
          }
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function clickEditArticle() {
    // 記事詳細で「記事データの編集」ボタンをクリック
    if (location.href.indexOf('/typeline/articles/') > -1) {
      // なぜかこのボタンはaタグでつくられているので、予めbutton化に備えておく
      let buttons = document.querySelectorAll('a[type="button"],button');
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '記事データの編集') {
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function clickSetArticleAsset() {
    // 記事詳細でアセットを「設定する」ボタンをクリック
    if (location.href.indexOf('/typeline/article') > -1) {
      let buttons = document.querySelectorAll('.MuiDialog-container button');
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '設定する') {
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function openListItems() {
    // テーブルでチェックが入った行のリンクをまとめて開く
    document.querySelectorAll('tr.pmpui-table-row').forEach(function(el) {
      if (el.children.item(0).querySelector('input[type="checkbox"]').checked) {
        window.open(el.querySelector('a').href);
      }
    });
  }

  function getParentTr(el) {
    if (el === null) {
      return null;
    }
    if (el.tagName.toLowerCase() === 'tr') {
      return el;
    }
    return getParentTr(el.parentNode);
  }

  function selectAssetByClickTr(ev) {
    if (ev.ctrlKey) return;
    let myTr = getParentTr(ev.target);
    if (myTr !== null) {
      myTr.querySelector('input[type="radio"],input[type="checkbox"]').click();
    }
  }

  function selectAssetByDblclickTr(ev) {
    selectAssetByClickTr(ev);
    let buttons = document.querySelectorAll('.MuiDialog-container button');
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].innerText === '保存する') {
        buttons[i].click();
        break;
      }
    }
  }

  const showNoteModalId = 'tlutil-show-note-modal';

  function createNoteModal() {
    let modal = document.getElementById(showNoteModalId);
    if (modal === null) {
      modal = document.createElement('div');
      modal.id = showNoteModalId;
      let modalHeader = document.createElement('div');
      modalHeader.id = showNoteModalId + '-header';
      modalHeader.innerText = '備考詳細';
      modal.appendChild(modalHeader);
      let modalBody = document.createElement('div');
      modalBody.id = showNoteModalId + '-body';
      modal.appendChild(modalBody);
      modal.addEventListener('click', hideNoteModal);
      document.body.appendChild(modal);
    }
    return modal;
  }

  function getNoteTd(ev) {
    let parentTr = getParentTr(ev.target);
    return parentTr.children.item(6);
  }

  function refreshNoteModal(ev) {
    let targetEl = getNoteTd(ev);
    const modal = createNoteModal();
    let leftTargetEl = document.querySelector('.pmpui-table-header-copy th.column-type');
    let leftTargetElRect = leftTargetEl === null ? { top: 0 } : leftTargetEl.getBoundingClientRect();
    if (leftTargetElRect.top === 0) {
      leftTargetEl = document.querySelector('.pmpui-table-container th.column-type');
      if (leftTargetEl === null) return;
      leftTargetElRect = leftTargetEl.getBoundingClientRect();
    }
    let rightTargetEl = document.querySelector('.pmpui-table-container th.column-mime_type');
    let rightTargetElRect = rightTargetEl.getBoundingClientRect();
    let myTop = leftTargetElRect.top;
    const myTopMin = 0;
    if (myTop < myTopMin) {
      myTop = myTopMin;
    }
    modal.style.top = myTop + 'px';
    modal.style.left = (1 + leftTargetElRect.left) + 'px';
    modal.style.width = (rightTargetElRect.right - leftTargetElRect.left - 1) + 'px';
    modal.style.height = (window.innerHeight - myTop - 40) + 'px';
    modal.children.item(0).style.lineHeight = leftTargetEl.offsetHeight + 'px';
    modal.children.item(1).innerText = targetEl.innerText;
    targetEl.classList.add('tlutil-show-note');
    return modal;
  }

  function mouseoutNoteModal(ev) {
    let targetEl = getNoteTd(ev);
    targetEl.classList.remove('tlutil-show-note');
  }

  function showNoteModal(ev) {
    if (!ev.ctrlKey) return;
    const modal = refreshNoteModal(ev);
    modal.style.display = 'block';
    document.querySelector('.pmpui-table-container').classList.add('tlutil-show-modal');
  }

  function hideNoteModal(ev) {
    if (!ev.ctrlKey) return;
    createNoteModal().style.display = 'none';
    const tableContainer = document.querySelector('.pmpui-table-container');
    if (tableContainer !== null) {
      // リスト表示がmodalの場合、domからcontainerが消えたあとにnoteModalを消すパターンがあるため
      tableContainer.classList.add('tlutil-show-modal');
    }
  }

  function adjustAssetListView() {
    // VACS導入後の備考文字数増加に備える
    document.querySelectorAll('tr.pmpui-table-row').forEach(function(el) {
      let noteEl = el.children.item(6);
      if (noteEl.adjusted !== true) {
        noteEl.classList.add('tlutil-note');
        el.addEventListener('mouseover', refreshNoteModal);
        el.addEventListener('mouseout', mouseoutNoteModal);
        noteEl.addEventListener('click', showNoteModal);
        noteEl.adjusted = true;
      }
    });
  }

  window.addEventListener('keydown', function(ev) {
    if (ev.ctrlKey && ev.key === 'Enter') {
      if (clickManuscriptToArticle()) return;
      if (clickEditArticle()) return;
      if (clickSetArticleAsset()) return;
      openListItems();
    } else if (ev.ctrlKey && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      let tableContainer = document.querySelector('.pmpui-table-container');
      if (tableContainer !== null) {
        tableContainer.scrollLeft = ev.key === 'ArrowLeft' ? 0 : 99999;
      }
    }
  });

  window.addEventListener('dblclick', function(ev) {
    if (clickManuscriptToArticle()) return;
    if (clickEditArticle()) return;
    if (clickSetArticleAsset()) return;
  });

  let articleCustomMenuList = [];
  let manuscriptCustomMenuList = [];

  var observer = new MutationObserver(function() {

    const picNavigationLink = document.querySelector('.pmpui-side-navigation__list a[href*=person_in_charge]');
    if (picNavigationLink !== null && articleCustomMenuList.length === 0) {
      const picUrl = picNavigationLink.href;
      const createdByMeUrl = picUrl.replace('person_in_charge', 'created_by');
      const baseSearchUrl = picUrl.split('?').shift();
      const prototypeMenuEl = picNavigationLink.parentElement.parentElement.cloneNode(true);
      [
        {
          name: '自分が作成者の記事',
          url: createdByMeUrl,
          style: [],
        },
        {
          name: 'カル･スポ以外',
          url: baseSearchUrl + '?filter=%7B%22article_type%22%3A%22ntv_article_news%22%2C%22tags.272c1139a6ec4c198e0349e830b2e999%22%3A%22%E5%9B%BD%E9%9A%9B%2C%E7%B5%8C%E6%B8%88%2C%E3%83%A9%E3%82%A4%E3%83%95%2C%E6%94%BF%E6%B2%BB%2C%E7%A4%BE%E4%BC%9A%22%7D',
          style: [],
        },
        {
          name: 'カルチャー',
          url: baseSearchUrl + '?filter=%7B%22article_type%22%3A%22ntv_article_news%22%2C%22tags.272c1139a6ec4c198e0349e830b2e999%22%3A%22%E3%82%AB%E3%83%AB%E3%83%81%E3%83%A3%E3%83%BC%22%7D',
          style: [],
        },
        {
          name: 'スポーツ',
          url: baseSearchUrl + '?filter=%7B%22article_type%22%3A%22ntv_article_news%22%2C%22tags.272c1139a6ec4c198e0349e830b2e999%22%3A%22%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84%22%7D',
          style: [],
        },
      ].forEach(function(x) {
        const myEl = prototypeMenuEl.cloneNode(true);
        const myLinkEl = myEl.querySelector('a');
        myLinkEl.href = x.url;
        myLinkEl.classList.add('custom-menu');
        myLinkEl.classList.add('custom-menu-article');
        myLinkEl.innerText = x.name + '#';
        x.style.forEach(function(y) {
          myLinkEl.style[y.key] = y.value;
        });
        articleCustomMenuList.push(myEl);
      });
    }

    const manuscriptNavigationLink = document.querySelector('.pmpui-side-navigation__list a[href$=manuscripts]');
    if (manuscriptNavigationLink !== null && manuscriptCustomMenuList.length === 0) {
      const baseSearchUrl = manuscriptNavigationLink.href.split('?').shift();
      const prototypeMenuEl = manuscriptNavigationLink.parentElement.parentElement.cloneNode(true);
      [
        {
          name: '報道原稿',
          url: baseSearchUrl + '?filter=%7B%22category%22%3A%22DV00000001_FE00000003%2CDV00000001_FE00000002%2CDV00000001_FE00000004%2CDV00000001_FE00000005%2CDV00000001_FE20000010%2CDV00000001_FE00000007%2CDV00000001_FE20000007%2CDV00000001_FE00000011%2CDV00000001_FE00000006%22%7D',
          style: [],
        },
        {
          name: '報道原稿(ﾆｭｰｽ編集除く)',
          url: baseSearchUrl + '?filter=%7B%22category%22%3A%22DV00000001_FE00000003%2CDV00000001_FE00000002%2CDV00000001_FE00000004%2CDV00000001_FE00000005%2CDV00000001_FE20000010%2CDV00000001_FE00000007%2CDV00000001_FE20000007%2CDV00000001_FE00000011%22%7D',
          style: [{key: 'fontSize', value: '0.9em'}],
        },
        {
          name: '災害･L字原稿',
          url: baseSearchUrl + '?filter=%7B%22category%22%3A%22DV00000001_FE00000002%2CDV00000001_FE00000003%2CDV00000001_FE00000004%22%2C%22type%22%3A%223%22%7D',
          style: [],
        },
      ].forEach(function(x) {
        const myEl = prototypeMenuEl.cloneNode(true);
        const myLinkEl = myEl.querySelector('a');
        myLinkEl.href = x.url;
        myLinkEl.classList.add('custom-menu');
        myLinkEl.classList.add('custom-menu-manuscript');
        myLinkEl.querySelector('span').innerText = x.name + '#';
        x.style.forEach(function(y) {
          myLinkEl.style[y.key] = y.value;
        });
        manuscriptCustomMenuList.push(myEl);
      });
    }

    if (picNavigationLink !== null && document.querySelectorAll('.custom-menu-article').length === 0) {
      const targetEl = picNavigationLink.parentElement.parentElement.parentElement;
      if (targetEl.innerHTML.indexOf('メニューに戻る') === -1) { // 記事種別サブメニューに入ったときはスルー
        articleCustomMenuList.forEach(function(el) { targetEl.appendChild(el); });
      }
    }

    if (manuscriptNavigationLink !== null && document.querySelectorAll('.custom-menu-manuscript').length === 0) {
      const targetEl = manuscriptNavigationLink.parentElement.parentElement.parentElement;
      manuscriptCustomMenuList.forEach(function(el) { targetEl.appendChild(el); });
    }

    // 素材管理メニューを閉じる動作に対応(#メニューの並び順が変わってしまう既知の不具合あり)
    document.querySelectorAll('.custom-menu-manuscript').forEach(function(el) { el.style.display = manuscriptNavigationLink === null ? 'none' : 'inherit'; });

    // カスタムメニューの active 制御
    document.querySelectorAll('.custom-menu').forEach(function(el) {
      if (location.href === el.href) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (location.href.indexOf('/typeline/article/creation/NoTemplate') > -1) {
      //location.href = location.href.replace('/NoTemplate', ''); // テンプレート未指定の記事作成を封じる→無効とする
    }
    // 記事詳細のアセット選択で行クリックでラジオOn
    // ダブルクリックでラジオOn→保存まで
    document.querySelectorAll('.master-table-asset tr').forEach(function(el) {
      if (el.injectEvent !== true) {
        el.addEventListener('click', selectAssetByClickTr);
        el.addEventListener('dblclick', selectAssetByDblclickTr);
        el.injectEvent = true;
      }
    });

    if (location.href.indexOf('/typeline/article') > -1) {
      // 記事作成画面

      // フォント・背景色等
      document.querySelectorAll('textarea').forEach(function(el) {
        el.style.fontFamily = 'MS Gothic';
        if (el.name === 'title') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'plum';
        } else if (el.name === 'sub_title') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'lightpink';
        } else if (el.name === 'summary') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'lightgreen';
        }
      });
      document.querySelectorAll('.rdw-editor-main').forEach(function(el) {
        el.style.fontFamily = 'MS Gothic';
      });

      // 入力補助コントロール
      document.querySelectorAll('.publish-period-form').forEach(function(el) {
        if (el.injectButton !== true) {
          el.injectButton = true;
          ['１週間', '１ヵ月', '１年', '年末'].forEach(function(x) {
            const btn = document.createElement('button');
            btn.innerText = x;
            btn.classList.add('pmpui-button');
            btn.classList.add('pmpui-button-size-small');
            btn.addEventListener('click', function(ev) {
              let dateTo = new Date();
              if (ev.target.innerText === '１週間') {
                dateTo.setDate(dateTo.getDate() + 7);
              } else if (ev.target.innerText === '１ヵ月') {
                dateTo.setMonth(dateTo.getMonth() + 1);
              } else if (ev.target.innerText === '１年') {
                dateTo.setFullYear(dateTo.getFullYear() + 1);
              } else {
                dateTo.setMonth(11);
                dateTo.setDate(31);
              }
              let tmpDateTo = dateTo.toLocaleString().split(' ')[0].split('/');
              let strDateTo = tmpDateTo[0] + '/' + ('0' + tmpDateTo[1]).slice(-2) + '/' + ('0' + tmpDateTo[2]).slice(-2);
              document.execCommand('copy');
              navigator.clipboard.writeText(strDateTo).then(function() {
                document.querySelectorAll('.pmpui-date-picker input')[1].select();
              });
            });
            el.appendChild(btn);
          });
          let lbl = document.createElement('label');
          lbl.style.fontSize = '0.8em';
          lbl.innerText = '※ボタンをClickで日付がクリップボードに入るのでCtrl+vでPasteしてください';
          el.appendChild(lbl);
        }
      });

      document.querySelectorAll('button').forEach(function(el) {
        if (el.textContent === 'アップロード') {
          if (el.parentNode.parentNode.innerText.indexOf('メディア') === 0) {
            el.style = 'visibility: hidden;';
          }
        }
      });

      document.querySelectorAll('.pmpui-radio-button').forEach(function(el) {
        if (el.textContent.indexOf('すべてに配信') > -1 && el.forceHidden !== true) {
          el.forceHidden = true;
          el.style = 'visibility: hidden;';
        }
      });

      document.querySelectorAll('.pmpui-radio-button').forEach(function(el) {
        if (el.textContent.indexOf('個別に配信') > -1 && el.forceClicked !== true) {
          el.forceClicked = true;
          el.querySelector('input').click();
        }
      });

      document.querySelectorAll('.pmpui-dropdown-items li').forEach(function(el) {
        if (el.textContent === 'すべて') {
          el.remove();
        }
      });

      // 配信先指定未指定対策
      if (document.querySelector('.pmpui-breadcrumb-group li') !== null
        && (document.querySelector('.pmpui-breadcrumb-group li:last-child').innerText === '記事の作成'
          || document.querySelector('.pmpui-breadcrumb-group li:nth-last-child(2)').innerText.indexOf('＜未定義＞') === 0)) {
        let sidebarLi = document.querySelectorAll('.pmpui-sidebar-control li');
        for (let i = 0; i < sidebarLi.length; i++) {
          if (sidebarLi[i].innerText === '配信先' && sidebarLi[i].alertInjected !== true) {
            sidebarLi[i].style.backgroundColor = 'gold';
            const alertBtn = document.createElement('button');
            alertBtn.id = 'distribution-alert-button';
            alertBtn.classList.add('pmpui-button');
            alertBtn.classList.add('pmpui-button-size-normal');
            alertBtn.innerText = 'の前に配信先確認！';
            alertBtn.style.borderColor = 'goldenrod';
            alertBtn.style.backgroundColor = 'gold';
            alertBtn.addEventListener('click', function(ev) {
              sidebarLi[i].querySelector('button').click();
            });
            document.querySelector('.pmpui-form__actions .pmpui-util-action-stripe-group').appendChild(alertBtn);
            sidebarLi[i].alertInjected = true;
            break;
          }
        }
      }

      // 初期値設定
      let priority = document.querySelector('input[name="custom_data.priority"]');
      if (priority && priority.value === '') { priority.value = 'B'; }

      // アセット一覧モーダルを見やすく
      adjustAssetListView();

    } else if (location.href.indexOf('/typeline/assets') > -1) {
      // アセット一覧
      // アセット一覧を見やすく
      adjustAssetListView();
      // アップロードを画像のみに限定
      const imageUploadEl = document.querySelector('input[type="file"]');
      if (imageUploadEl !== null) {
        imageUploadEl.accept = 'image/jpeg,image/png';
      }
    } else if (location.href.indexOf('/typeline/manuscripts') > -1) {
      // 原稿一覧
      /* 使用不可行の色を変更 */
      document.querySelectorAll('tr.pmpui-table-row').forEach(function(el) {
        if (el.children.item(1).textContent.indexOf('NC:') === 0 || el.children.item(3).textContent === '不可') {
          el.classList.add('tlutil-invalid');
        } else {
          el.classList.remove('tlutil-invalid');
        }
      });
    }
  });
  observer.observe(document, {childList: true, subtree: true});
})();
