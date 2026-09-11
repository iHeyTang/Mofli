import { useRef } from "react";
import { Plus, X } from "lucide-react";
import { model } from "./model.js";
export function CreatePet() {
  const dialog = useRef<HTMLDialogElement>(null);
  const dimension = model.is3D ? "3d" : "2d";
  return (
    <>
      <button
        className="create-pet-button"
        onClick={() => dialog.current?.showModal()}
      >
        <Plus size={15} />
        新建宠物
      </button>
      <dialog ref={dialog} className="create-pet-dialog">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            model.create(dimension, String(form.get("name") ?? ""));
            dialog.current?.close();
          }}
        >
          <div className="panel-heading">
            <span>新建 {dimension.toUpperCase()} 宠物</span>
            <button
              type="button"
              aria-label="关闭新建"
              onClick={() => dialog.current?.close()}
            >
              <X size={18} />
            </button>
          </div>
          <label className="pet-name-field">
            名字
            <input
              name="name"
              maxLength={60}
              placeholder={dimension === "3d" ? "Mallow 3D" : "Mallow"}
            />
          </label>
          <button className="create-pet-submit" type="submit">
            创建
          </button>
        </form>
      </dialog>
    </>
  );
}
